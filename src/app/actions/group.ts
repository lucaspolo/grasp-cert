"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireRole, requireSession } from "@/lib/auth-utils";
import {
  isPlatformAdmin,
  requireAnyGroupAdmin,
  requireGroupAdmin,
} from "@/lib/group-access";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const groupSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .transform((v) => v.trim()),
  callsign: z
    .string()
    .max(10, "Indicativo deve ter no máximo 10 caracteres")
    .transform((v) => v.toUpperCase().trim())
    .optional(),
  description: z
    .string()
    .max(500, "Descrição deve ter no máximo 500 caracteres")
    .optional(),
});

const memberRoleSchema = z.enum(["ADMIN", "MEMBER"]);

export type GroupFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

/** Nome já usado por outro grupo (P2002 no índice único). */
function isDuplicateName(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function parseGroupForm(formData: FormData) {
  return groupSchema.safeParse({
    name: formData.get("name"),
    callsign: (formData.get("callsign") as string) || undefined,
    description: (formData.get("description") as string) || undefined,
  });
}

// --- Leitura ---

export type GroupListItem = {
  id: string;
  name: string;
  callsign: string | null;
  description: string | null;
  createdAt: Date;
  counts: { members: number; events: number; templates: number };
  /** Cargo do próprio usuário no grupo — null quando ele não é membro. */
  myRole: "ADMIN" | "MEMBER" | null;
  /** Se a sessão pode editar o grupo e seu quadro de membros. */
  canAdmin: boolean;
};

/**
 * Grupos visíveis para quem chama: todos, para quem administra a plataforma;
 * só os seus, para os demais. Sem grupo nenhum, devolve lista vazia — não é
 * erro, é a tela de quem ainda não entrou em nenhum clube.
 */
export async function listGroups(): Promise<GroupListItem[]> {
  const session = await requireSession();
  const platformAdmin = isPlatformAdmin(session.user.role);

  const groups = await prisma.group.findMany({
    where: platformAdmin
      ? undefined
      : { members: { some: { userId: session.user.id } } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      callsign: true,
      description: true,
      createdAt: true,
      _count: { select: { members: true, events: true, templates: true } },
      members: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  });

  return groups.map((g) => {
    const myRole = g.members[0]?.role ?? null;
    return {
      id: g.id,
      name: g.name,
      callsign: g.callsign,
      description: g.description,
      createdAt: g.createdAt,
      counts: {
        members: g._count.members,
        events: g._count.events,
        templates: g._count.templates,
      },
      myRole,
      canAdmin: platformAdmin || myRole === "ADMIN",
    };
  });
}

export type GroupOption = { id: string; name: string };

/**
 * Grupos que a sessão pode administrar — alimenta os seletores de grupo dos
 * formulários de evento e de template.
 */
export async function listAdminGroups(): Promise<GroupOption[]> {
  const { groupIds } = await requireAnyGroupAdmin();

  return prisma.group.findMany({
    where: groupIds ? { id: { in: groupIds } } : undefined,
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getGroup(groupId: string) {
  await requireGroupAdmin(groupId);

  return prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      callsign: true,
      description: true,
      _count: { select: { events: true, templates: true } },
    },
  });
}

export async function listGroupMembers(groupId: string) {
  await requireGroupAdmin(groupId);

  return prisma.groupMember.findMany({
    where: { groupId },
    orderBy: [{ role: "asc" }, { user: { callsign: "asc" } }],
    select: {
      role: true,
      createdAt: true,
      user: { select: { id: true, callsign: true, name: true } },
    },
  });
}

// --- Escrita ---

/**
 * Criar grupo é ato da PLATAFORMA, não de um grupo: quem já é admin de um
 * clube não ganha com isso o direito de abrir outros. Fica com OWNER/ADMIN.
 */
export async function createGroup(
  _prevState: GroupFormState,
  formData: FormData
): Promise<GroupFormState> {
  const session = await requireRole(["OWNER", "ADMIN"]);

  const parsed = parseGroupForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // Admin inicial (opcional): um grupo sem admin próprio só é gerenciável por
  // quem administra a plataforma, o que raramente é a intenção.
  const adminCallsign = ((formData.get("adminCallsign") as string) || "")
    .toUpperCase()
    .trim();

  let firstAdminId: string | null = null;
  if (adminCallsign) {
    const user = await prisma.user.findUnique({
      where: { callsign: adminCallsign },
      select: { id: true },
    });
    if (!user) {
      return {
        errors: { adminCallsign: [`Nenhum usuário com o indicativo ${adminCallsign}.`] },
      };
    }
    firstAdminId = user.id;
  }

  let group;
  try {
    group = await prisma.group.create({
      data: {
        name: parsed.data.name,
        callsign: parsed.data.callsign || null,
        description: parsed.data.description || null,
        members: firstAdminId
          ? { create: { userId: firstAdminId, role: "ADMIN" } }
          : undefined,
      },
      select: { id: true, name: true },
    });
  } catch (error) {
    if (isDuplicateName(error)) {
      return { errors: { name: ["Já existe um grupo com esse nome."] } };
    }
    throw error;
  }

  await recordAudit(session.user, {
    action: "group.created",
    entityType: "group",
    entityId: group.id,
    summary: `Grupo ${group.name} criado`,
    details: { adminCallsign: adminCallsign || null },
  });

  revalidatePath("/admin/groups");
  redirect(`/admin/groups/${group.id}`);
}

export async function updateGroup(
  groupId: string,
  _prevState: GroupFormState,
  formData: FormData
): Promise<GroupFormState> {
  const session = await requireGroupAdmin(groupId);

  const parsed = parseGroupForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const previous = await prisma.group.findUnique({
    where: { id: groupId },
    select: { name: true },
  });
  if (!previous) {
    return { errors: { name: ["Grupo não encontrado."] } };
  }

  try {
    await prisma.group.update({
      where: { id: groupId },
      data: {
        name: parsed.data.name,
        callsign: parsed.data.callsign || null,
        description: parsed.data.description || null,
      },
    });
  } catch (error) {
    if (isDuplicateName(error)) {
      return { errors: { name: ["Já existe um grupo com esse nome."] } };
    }
    throw error;
  }

  await recordAudit(session.user, {
    action: "group.updated",
    entityType: "group",
    entityId: groupId,
    summary: `Grupo ${previous.name} atualizado`,
    details: { from: previous.name, to: parsed.data.name },
  });

  revalidatePath("/admin/groups");
  revalidatePath(`/admin/groups/${groupId}`);
  return { message: "Grupo atualizado." };
}

/**
 * Excluir é do OWNER e só vale para grupo vazio: eventos e templates carregam
 * certificados já emitidos, que não podem sumir junto.
 */
export async function deleteGroup(groupId: string) {
  const session = await requireRole(["OWNER"]);

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      name: true,
      _count: { select: { events: true, templates: true } },
    },
  });
  if (!group) return { error: "Grupo não encontrado." };

  if (group._count.events > 0 || group._count.templates > 0) {
    return {
      error: `Não é possível excluir — o grupo tem ${group._count.events} evento(s) e ${group._count.templates} template(s).`,
    };
  }

  await prisma.group.delete({ where: { id: groupId } });

  await recordAudit(session.user, {
    action: "group.deleted",
    entityType: "group",
    entityId: groupId,
    summary: `Grupo ${group.name} excluído`,
    details: { name: group.name },
  });

  revalidatePath("/admin/groups");
  return { success: true };
}

export async function addGroupMember(
  groupId: string,
  callsign: string,
  role: string
) {
  const session = await requireGroupAdmin(groupId);

  const parsedRole = memberRoleSchema.safeParse(role);
  if (!parsedRole.success) return { error: "Cargo inválido." };

  const normalized = callsign.toUpperCase().trim();
  if (normalized.length < 3) {
    return { error: "Informe o indicativo do radioamador." };
  }

  const user = await prisma.user.findUnique({
    where: { callsign: normalized },
    select: { id: true, callsign: true },
  });
  if (!user) {
    return { error: `Nenhum usuário com o indicativo ${normalized}.` };
  }

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
    select: { id: true },
  });
  if (existing) {
    return { error: `${user.callsign} já é membro deste grupo.` };
  }

  await prisma.groupMember.create({
    data: { groupId, userId: user.id, role: parsedRole.data },
  });

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { name: true },
  });

  await recordAudit(session.user, {
    action: "group.member_added",
    entityType: "group",
    entityId: groupId,
    summary: `${user.callsign} adicionado ao grupo ${group?.name ?? groupId} como ${parsedRole.data}`,
    details: { callsign: user.callsign, role: parsedRole.data },
  });

  revalidatePath(`/admin/groups/${groupId}`);
  return { success: true };
}

/** Sobra ao menos um admin no grupo depois de mexer em `userId`? */
async function wouldLeaveGroupWithoutAdmin(
  groupId: string,
  userId: string
): Promise<boolean> {
  const remaining = await prisma.groupMember.count({
    where: { groupId, role: "ADMIN", userId: { not: userId } },
  });
  return remaining === 0;
}

export async function updateGroupMemberRole(
  groupId: string,
  userId: string,
  role: string
) {
  const session = await requireGroupAdmin(groupId);

  const parsedRole = memberRoleSchema.safeParse(role);
  if (!parsedRole.success) return { error: "Cargo inválido." };

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { role: true, user: { select: { callsign: true } } },
  });
  if (!member) return { error: "Membro não encontrado." };
  if (member.role === parsedRole.data) return { success: true };

  // Um grupo sem admin próprio fica órfão: ninguém de dentro consegue mais
  // cadastrar template, criar evento ou chamar gente nova.
  if (
    parsedRole.data === "MEMBER" &&
    (await wouldLeaveGroupWithoutAdmin(groupId, userId))
  ) {
    return { error: "O grupo precisa de pelo menos um admin." };
  }

  await prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId } },
    data: { role: parsedRole.data },
  });

  await recordAudit(session.user, {
    action: "group.member_role_updated",
    entityType: "group",
    entityId: groupId,
    summary: `${member.user.callsign} passou de ${member.role} para ${parsedRole.data} no grupo`,
    details: { callsign: member.user.callsign, from: member.role, to: parsedRole.data },
  });

  revalidatePath(`/admin/groups/${groupId}`);
  return { success: true };
}

export async function removeGroupMember(groupId: string, userId: string) {
  const session = await requireGroupAdmin(groupId);

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { role: true, user: { select: { callsign: true } } },
  });
  if (!member) return { error: "Membro não encontrado." };

  if (
    member.role === "ADMIN" &&
    (await wouldLeaveGroupWithoutAdmin(groupId, userId))
  ) {
    return { error: "O grupo precisa de pelo menos um admin." };
  }

  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId, userId } },
  });

  await recordAudit(session.user, {
    action: "group.member_removed",
    entityType: "group",
    entityId: groupId,
    summary: `${member.user.callsign} removido do grupo`,
    details: { callsign: member.user.callsign, role: member.role },
  });

  revalidatePath(`/admin/groups/${groupId}`);
  return { success: true };
}
