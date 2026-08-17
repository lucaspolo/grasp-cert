import type { TutorialAudience } from "@/lib/role-labels";

export type TutorialShot = {
  /** Caminho a partir de `public/`. */
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
};

export type TutorialStep = {
  text: string;
  shot?: TutorialShot;
};

export type TutorialSection = {
  /** Âncora da seção (`/ajuda#slug`). */
  slug: string;
  title: string;
  /**
   * Quem pode executar o procedimento — lista explícita, não "cargo mínimo":
   * a matriz não é puramente hierárquica (o operador é limitado aos eventos
   * em que foi designado, e a gestão de usuários é só do Owner).
   */
  audiences: TutorialAudience[];
  /** Ressalva de escopo, quando o cargo sozinho não conta a história toda. */
  note?: string;
  intro: string;
  steps: TutorialStep[];
};

export const TUTORIAL_SECTIONS: TutorialSection[] = [
  {
    slug: "primeiros-passos",
    title: "1. Criar sua conta e entrar",
    audiences: ["PUBLIC"],
    note: "Todo cadastro novo entra como Usuário. Cargos maiores só são concedidos pelo Owner.",
    intro:
      "Qualquer radioamador pode se cadastrar. A conta é identificada pelo indicativo, que não pode ser alterado depois — confira antes de enviar.",
    steps: [
      {
        text: 'Na página inicial, clique em "Entrar" e depois em "Registre-se". Preencha indicativo, nome, e-mail, cidade, UF e senha. O indicativo é a sua identificação no sistema e aparecerá no certificado.',
        shot: {
          src: "/ajuda/12-cadastro.webp",
          alt: "Formulário de cadastro com os campos Indicativo, Nome, E-mail, Cidade, UF, Senha e Confirmar Senha",
          width: 510,
          height: 640,
        },
      },
      {
        text: "Depois de cadastrar, o sistema envia um e-mail de verificação. Abra a mensagem e clique no link — a conta só consegue entrar depois de verificada. Se o e-mail não chegar, tente entrar mesmo assim: a tela de login oferece o botão \"Reenviar e-mail de verificação\".",
      },
      {
        text: "Com o e-mail confirmado, entre com o indicativo e a senha.",
        shot: {
          src: "/ajuda/13-login.webp",
          alt: "Tela de login com os campos Indicativo e Senha e o botão Entrar",
          width: 510,
          height: 395,
        },
      },
      {
        text: 'Esqueceu a senha? Clique em "Esqueci minha senha" e informe o e-mail cadastrado. Você receberá um link para definir uma nova senha. Por segurança, a resposta é sempre a mesma, exista ou não a conta.',
        shot: {
          src: "/ajuda/14-esqueci-senha.webp",
          alt: "Tela de recuperação de senha com o campo E-mail e o botão Enviar link de recuperação",
          width: 510,
          height: 295,
        },
      },
    ],
  },
  {
    slug: "sua-conta",
    title: "2. Seus dados e a verificação em duas etapas",
    audiences: ["USER", "OPERATOR", "ADMIN", "OWNER"],
    intro:
      'Clique no seu indicativo, no canto direito do menu, para abrir as Configurações. Ali ficam seus dados cadastrais, a troca de senha e a autenticação de dois fatores (2FA).',
    steps: [
      {
        text: 'Em "Dados pessoais" você atualiza nome, e-mail, cidade e estado. O indicativo fica travado. Trocar o e-mail exige confirmar a senha atual, e o novo endereço precisa ser verificado outra vez.',
        shot: {
          src: "/ajuda/21-configuracoes.webp",
          alt: "Tela de Configurações com o cartão Dados pessoais e o campo Indicativo desabilitado",
          width: 670,
          height: 745,
        },
      },
      {
        text: 'Mais abaixo, o cartão "Autenticação de dois fatores" começa desativado. Clique em "Ativar 2FA" para começar.',
        shot: {
          src: "/ajuda/22-2fa-desativado.webp",
          alt: "Cartão de autenticação de dois fatores desativado, com o botão Ativar 2FA",
          width: 660,
          height: 210,
        },
      },
      {
        text: "Escaneie o QR Code no seu aplicativo autenticador (Google Authenticator, Authy e similares) — ou copie a chave manualmente — e digite o código de 6 dígitos gerado.",
        shot: {
          src: "/ajuda/23-2fa-qrcode.webp",
          alt: "Etapa de configuração do 2FA mostrando o QR Code, a chave manual e o campo para o código de 6 dígitos",
          width: 660,
          height: 555,
        },
      },
      {
        text: "Guarde os códigos de recuperação num lugar seguro. Cada um funciona uma única vez e serve para entrar caso você perca o acesso ao autenticador. Eles não são exibidos de novo.",
        shot: {
          src: "/ajuda/24-2fa-codigos-recuperacao.webp",
          alt: "Lista de dez códigos de recuperação com o botão Copiar códigos e o aviso de que não serão exibidos novamente",
          width: 870,
          height: 490,
        },
      },
      {
        text: 'Com o 2FA ativo, o cartão passa a mostrar os dispositivos confiáveis — os que você marcou como "Confiar neste dispositivo por 30 dias" ao entrar — além dos botões para gerar novos códigos e desativar o 2FA.',
        shot: {
          src: "/ajuda/25-2fa-ativo.webp",
          alt: "Cartão de 2FA ativo mostrando dispositivos confiáveis e os botões de gerar novos códigos e desativar",
          width: 660,
          height: 340,
        },
      },
    ],
  },
  {
    slug: "meus-certificados",
    title: "3. Baixar seu certificado",
    audiences: ["USER", "OPERATOR", "ADMIN", "OWNER"],
    note: "Os QSOs não são lançados por você: quem opera a estação registra os contatos, e eles aparecem aqui automaticamente pelo seu indicativo.",
    intro:
      'A página "Meus Certificados" reúne, por evento, todos os contatos em que o seu indicativo aparece — e o certificado correspondente.',
    steps: [
      {
        text: "Cada evento vira um cartão com os modos e faixas em que você trabalhou e a lista dos seus QSOs, com data e hora em UTC.",
        shot: {
          src: "/ajuda/20-meus-certificados.webp",
          alt: "Página Meus Certificados com um cartão de evento, a tabela de QSOs e os botões de download",
          width: 1120,
          height: 555,
        },
      },
      {
        text: '"Baixar PNG" abre a imagem do certificado numa nova aba; "Baixar PDF" gera o mesmo desenho em página A5 paisagem, pronto para impressão. Os dois formatos são idênticos por construção.',
        shot: {
          src: "/ajuda/26-certificado-participante.webp",
          alt: "Certificado de participação com o indicativo em destaque, período do evento, modos, faixas e QR Code",
          width: 800,
          height: 500,
          caption:
            "O número de série no rodapé é determinístico: o mesmo evento e indicativo geram sempre o mesmo código.",
        },
      },
      {
        text: '"Verificar" abre a página pública de conferência, e o botão de copiar guarda esse link na área de transferência — é o que você manda para quem precisa confirmar a autenticidade.',
      },
    ],
  },
  {
    slug: "verificar-certificado",
    title: "4. Conferir a autenticidade de um certificado",
    audiences: ["PUBLIC"],
    intro:
      "Todo certificado traz um QR Code e um número de série. Qualquer pessoa pode conferir se ele é verdadeiro, sem precisar de conta.",
    steps: [
      {
        text: "Aponte a câmera para o QR Code do certificado, ou abra o link de verificação. A página confirma a autenticidade e mostra o certificado renderizado na hora, a partir dos dados do banco.",
        shot: {
          src: "/ajuda/15-verificar-certificado.webp",
          alt: 'Página pública de verificação com a faixa verde "Certificado Autêntico" e o certificado abaixo',
          width: 800,
          height: 615,
        },
      },
      {
        text: 'Em "Detalhes da Verificação" aparecem o número de série, o evento, o indicativo, o nome e a lista completa dos QSOs que sustentam aquele certificado.',
        shot: {
          src: "/ajuda/16-verificar-detalhes.webp",
          alt: "Bloco de detalhes da verificação com número de série, evento, indicativo e a tabela de QSOs",
          width: 785,
          height: 500,
        },
      },
      {
        text: "Se o indicativo não tiver nenhum QSO naquele evento, a página responde 404 — não existe certificado para conferir.",
      },
    ],
  },
  {
    slug: "acompanhar-eventos",
    title: "5. Acompanhar eventos e estatísticas",
    audiences: ["PUBLIC"],
    intro:
      'A página inicial lista os eventos abertos, separados em "Acontecendo agora" e "Em breve". Não é preciso entrar para consultá-la.',
    steps: [
      {
        text: "Cada cartão traz o período, as faixas e os modos válidos e as observações do organizador.",
        shot: {
          src: "/ajuda/10-home-publica.webp",
          alt: 'Página inicial com as seções Acontecendo agora e Em breve, cada evento num cartão',
          width: 1120,
          height: 740,
        },
      },
      {
        text: '"Ver estatísticas" abre a página pública do evento: total de QSOs, número de participantes e o ranking por indicativo.',
        shot: {
          src: "/ajuda/11-evento-estatisticas.webp",
          alt: "Página de estatísticas do evento com os cartões Total de QSOs e Participantes e o ranking por indicativo",
          width: 1120,
          height: 700,
        },
      },
    ],
  },
  {
    slug: "lancar-qsos",
    title: "6. Lançar QSOs de um evento",
    audiences: ["OPERATOR", "ADMIN", "OWNER"],
    note: "O operador só enxerga os eventos em que foi designado, e só pode editar ou excluir os QSOs que ele mesmo lançou. Admin e Owner enxergam todos.",
    intro:
      'Depois de entrar, o menu ganha o item "Eventos". É por ali que se registram os contatos que dão direito ao certificado.',
    steps: [
      {
        text: 'A lista mostra apenas os eventos designados a você. A ação "QSOs" abre a tela de lançamento daquele evento.',
        shot: {
          src: "/ajuda/30-eventos-operador.webp",
          alt: "Lista de eventos vista por um operador, com apenas um evento e somente a ação QSOs",
          width: 1120,
          height: 240,
        },
      },
      {
        text: "A tela reúne tudo: o formulário de lançamento à esquerda, a importação ADIF à direita e a tabela de QSOs já registrados embaixo.",
        shot: {
          src: "/ajuda/31-qsos-do-evento.webp",
          alt: "Tela de QSOs do evento com o formulário Adicionar QSO, o painel Importar ADIF e a tabela de contatos",
          width: 1120,
          height: 800,
        },
      },
      {
        text: "Para lançar um contato manualmente, informe o indicativo, a data e hora em UTC, a banda, o modo e os relatórios RST enviado e recebido. As listas de banda e modo trazem apenas o que foi habilitado naquele evento.",
        shot: {
          src: "/ajuda/32-qso-formulario.webp",
          alt: "Formulário Adicionar QSO preenchido com indicativo, data/hora, banda, modo e RST",
          width: 555,
          height: 360,
        },
      },
      {
        text: 'Na tabela, "Editar" abre o mesmo formulário numa janela e "Excluir" pede confirmação antes de apagar. O sistema recusa dois contatos idênticos — mesmo indicativo, horário, banda e modo no mesmo evento.',
      },
    ],
  },
  {
    slug: "adif",
    title: "7. Importar e exportar ADIF",
    audiences: ["OPERATOR", "ADMIN", "OWNER"],
    note: "Vale a mesma regra da seção anterior: o operador só importa e exporta nos eventos em que foi designado.",
    intro:
      "Em vez de digitar contato por contato, envie o arquivo .adi que o seu logger (WSJT-X, N1MM e outros) já gera.",
    steps: [
      {
        text: 'No painel "Importar ADIF", escolha o arquivo e clique em "Importar". O resumo mostra quantos contatos entraram, quantos eram repetidos e quantos foram recusados.',
        shot: {
          src: "/ajuda/33-adif-importacao.webp",
          alt: "Painel de importação ADIF com o resumo de importados, duplicados e rejeitados e a lista de linhas recusadas",
          width: 550,
          height: 360,
          caption:
            'Abrir "Ver linhas rejeitadas" mostra o motivo de cada recusa, com o número da linha do arquivo.',
        },
      },
      {
        text: "Contatos repetidos são ignorados automaticamente, então reimportar o mesmo arquivo é seguro. São recusadas as linhas sem indicativo válido, com data ou hora impossível, ou com banda e modo que não pertencem ao evento.",
      },
      {
        text: 'Para levar os dados embora, use "Exportar ADIF" no topo da tela: o download traz todos os QSOs do evento em formato padrão.',
      },
      {
        text: "Quer testar antes? Baixe o arquivo de exemplo usado nesta seção — ele contém quatro contatos válidos, um repetido e dois com erro de propósito: /ajuda/exemplo.adi",
      },
    ],
  },
  {
    slug: "certificado-operador",
    title: "8. Baixar o certificado de operador",
    audiences: ["OPERATOR", "ADMIN", "OWNER"],
    intro:
      'Quem lança contatos também ganha certificado. Em "Meus Certificados", abaixo dos seus certificados de participação, aparece o bloco "Eventos que você operou".',
    steps: [
      {
        text: "O cartão resume quantos QSOs você lançou naquele evento, em quais modos e faixas.",
        shot: {
          src: "/ajuda/34-certificado-operador-pagina.webp",
          alt: 'Bloco "Eventos que você operou" com o total de QSOs lançados e os botões de download',
          width: 1120,
          height: 450,
        },
      },
      {
        text: "O certificado é o mesmo desenho do de participação, mas identificado como certificado de operador e com número de série próprio.",
        shot: {
          src: "/ajuda/35-certificado-operador.webp",
          alt: "Certificado de operador com o indicativo do operador e o total de QSOs lançados",
          width: 800,
          height: 500,
        },
      },
    ],
  },
  {
    slug: "gerenciar-eventos",
    title: "9. Criar e gerenciar eventos",
    audiences: ["ADMIN", "OWNER"],
    intro:
      "O administrador enxerga todos os eventos e ganha as ações de criar, editar e excluir, além de designar quem pode lançar QSOs.",
    steps: [
      {
        text: 'A lista completa traz o botão "Novo Evento" e, em cada linha, as ações Editar e Excluir.',
        shot: {
          src: "/ajuda/40-eventos-admin.webp",
          alt: "Lista de eventos vista por um administrador, com o botão Novo Evento e as ações Editar e Excluir",
          width: 1120,
          height: 310,
        },
      },
      {
        text: "No formulário, informe o nome e o período. As datas são no horário local do seu navegador — o rótulo lembra disso. O ícone de calendário abre um seletor com hora e minuto.",
        shot: {
          src: "/ajuda/43-novo-evento-calendario.webp",
          alt: "Seletor de data aberto, com o calendário do mês, os campos de hora e minuto e o botão OK",
          width: 620,
          height: 460,
        },
      },
      {
        text: "Marque as faixas e os modos válidos. Essa escolha é o que limita, depois, o que pode ser lançado como QSO e o que a importação ADIF aceita.",
        shot: {
          src: "/ajuda/42-novo-evento.webp",
          alt: "Formulário de novo evento preenchido com nome, datas e faixas e modos marcados",
          width: 620,
          height: 740,
        },
      },
      {
        text: 'Ao final, escolha o template do certificado. Deixando "Padrão (sem template)", o evento usa o modelo padrão do sistema.',
        shot: {
          src: "/ajuda/44-novo-evento-template.webp",
          alt: "Campo Observações, seletor de Template do Certificado e botão Salvar",
          width: 620,
          height: 235,
        },
      },
      {
        text: 'Na edição do evento, o bloco "Operadores Designados" controla quem pode lançar QSOs ali. Só usuários com cargo Operador aparecem na lista — promova o usuário primeiro, na tela de Usuários.',
        shot: {
          src: "/ajuda/45-designar-operador.webp",
          alt: "Bloco Operadores Designados com o seletor de operador, o botão Designar e a tabela de operadores",
          width: 1120,
          height: 205,
        },
      },
      {
        text: 'Atenção: o botão "Excluir" da lista de eventos apaga na hora, sem pedir confirmação, e leva junto todos os QSOs daquele evento.',
      },
    ],
  },
  {
    slug: "templates-bandas-modos",
    title: "10. Personalizar certificados, bandas e modos",
    audiences: ["ADMIN", "OWNER"],
    note: 'O template "Padrão" não pode ser renomeado nem excluído: ele é o modelo usado por todo evento que não tem template próprio.',
    intro:
      'O menu "Configurações" reúne os catálogos do sistema: os templates de certificado e as listas de bandas e modos.',
    steps: [
      {
        text: 'O menu aparece só para Admin e Owner, com os atalhos para Templates, Bandas e Modos.',
        shot: {
          src: "/ajuda/41-menu-configuracoes.webp",
          alt: "Menu superior com o item Configurações aberto, mostrando Templates, Bandas e Modos",
          width: 1120,
          height: 165,
        },
      },
      {
        text: 'Na lista de templates, "Novo Template" pede só um nome e leva direto para o editor. A coluna "Eventos" mostra quantos eventos usam cada modelo.',
        shot: {
          src: "/ajuda/46-templates-lista.webp",
          alt: "Lista de templates com as colunas Nome, Imagem, Eventos e Criado em",
          width: 1120,
          height: 290,
        },
      },
      {
        text: "Você pode enviar uma arte de fundo (PNG, JPEG ou WebP, de 800×500 a 1920×1200 pixels, até 5 MB). Sem imagem, o certificado usa o fundo amarelo padrão com selo, borda e marca d'água.",
        shot: {
          src: "/ajuda/47-template-imagem-fundo.webp",
          alt: "Cartão de imagem de fundo do template com o seletor de arquivo e o botão Enviar",
          width: 1095,
          height: 330,
        },
      },
      {
        text: 'No editor de layout, arraste os campos direto sobre o certificado. Ao selecionar um campo, o painel da direita permite ajustar posição, tamanho da fonte, cor e a âncora horizontal. O botão do olho esconde um campo, e "Ver PNG real" abre o certificado gerado de verdade, com as alterações ainda não salvas.',
        shot: {
          src: "/ajuda/48-editor-template.webp",
          alt: "Editor visual do template com o campo Indicativo selecionado no certificado e o painel de ajustes ao lado",
          width: 1095,
          height: 765,
          caption:
            "A âncora define que ponto do texto fica no X — é o que decide para que lado o campo cresce quando o dado real for mais longo que o exemplo.",
        },
      },
      {
        text: "As telas de Bandas e Modos funcionam igual: um formulário no topo para incluir, e Editar/Excluir em cada linha. A ordem controla como aparecem nos formulários de evento e de QSO.",
        shot: {
          src: "/ajuda/49-bandas.webp",
          alt: "Tela de bandas com o formulário de inclusão no topo e a tabela com nome, rótulo, ordem e ações",
          width: 1120,
          height: 700,
        },
      },
    ],
  },
  {
    slug: "usuarios-e-auditoria",
    title: "11. Usuários e trilha de auditoria",
    audiences: ["OWNER"],
    intro:
      "Só o Owner administra cargos e consulta o histórico de ações administrativas.",
    steps: [
      {
        text: 'A tela de Usuários lista todo mundo, com cargo e situação do e-mail. "Verificar e-mail" aparece só nas contas ainda pendentes e serve para liberar o acesso manualmente quando o e-mail não chega.',
        shot: {
          src: "/ajuda/50-usuarios.webp",
          alt: "Tela de usuários com indicativo, nome, e-mail, cidade, cargo, situação do e-mail e ações",
          width: 1120,
          height: 460,
        },
      },
      {
        text: "O cargo é alterado direto na lista e salva na hora. É assim que se promove alguém a Operador antes de designá-lo a um evento. Você não pode alterar nem excluir o próprio cargo.",
        shot: {
          src: "/ajuda/51-usuario-cargo.webp",
          alt: "Seletor de cargo aberto na tabela de usuários, com as opções Owner, Admin, Operador e Usuário",
          width: 1120,
          height: 460,
        },
      },
      {
        text: "A Auditoria registra as ações administrativas: quem fez, o que fez e quando.",
        shot: {
          src: "/ajuda/52-auditoria-lista.webp",
          alt: "Tela de auditoria com as colunas Data, Autor, Ação e Resumo",
          width: 1120,
          height: 330,
        },
      },
      {
        text: '"Detalhes" abre os dados brutos daquele registro, úteis para entender exatamente o que mudou.',
        shot: {
          src: "/ajuda/53-auditoria-detalhes.webp",
          alt: "Registro de auditoria expandido mostrando os detalhes em JSON",
          width: 1120,
          height: 440,
        },
      },
    ],
  },
];
