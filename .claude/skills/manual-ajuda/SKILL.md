---
name: manual-ajuda
description: Como manter o manual ilustrado do GRASP Cert em /ajuda — quando ele fica desatualizado, como recapturar telas com o Chrome, como escrever seções e cargos, e que rumo o manual deve tomar. Use ao mexer em qualquer tela que apareça no manual, ao criar página ou rota nova, ao mudar papel/permissão em src/proxy.ts ou nos server actions, ao alterar o layout do certificado, e sempre que for editar src/app/ajuda/ ou public/ajuda/.
---

# Manter o manual em `/ajuda`

O manual é a única documentação **do usuário final** deste projeto. `AGENTS.md`
é para quem escreve código; `/ajuda` é para o radioamador que quer o certificado
e para o organizador que vai lançar os QSOs.

Ele é ilustrado com capturas reais do sistema — o que o torna útil e, ao mesmo
tempo, o único documento do repositório que **apodrece silenciosamente**: mudar o
rótulo de um botão não quebra teste nenhum, mas deixa a imagem mentindo.

## Quando o manual precisa ser mexido

Trate como parte da tarefa, não como follow-up. Os gatilhos, em ordem de gravidade:

| Você mudou | O que fazer no manual |
|---|---|
| Papel/permissão em `src/proxy.ts` (`ROUTE_ROLES`) ou um `requireRole(...)` | **Corrigir `audiences` e `note` da seção.** É o pior erro possível aqui: manual que promete acesso que o sistema nega |
| Rótulo, campo ou botão de uma tela ilustrada | Recapturar aquela imagem e revisar o texto do passo |
| Página ou fluxo novo | Seção nova (ou passo novo, se couber numa existente) |
| Item do menu (`navbar.tsx` / `mobile-nav.tsx`) | Recapturar `41-menu-configuracoes` e revisar a seção 10 |
| Layout do certificado (`src/lib/certificate*.tsx`) | Gerar de novo as imagens de certificado (ver abaixo — não são screenshot) |
| Nome/valor de cargo | `src/lib/role-labels.ts` é a fonte única; o manual e a tela de Usuários leem dela |

Mudança só de estilo (cor, espaçamento) normalmente **não** justifica recaptura.
Imagem levemente fora do tom atual incomoda menos do que recapturar tudo a cada
ajuste visual — e quem recaptura por qualquer motivo acaba não recapturando pelos
que importam.

## Como o manual é montado

- `src/app/ajuda/content.ts` — o conteúdo inteiro, como **estrutura de dados
  tipada**. É onde se escreve.
- `src/app/ajuda/page.tsx` — cabeçalho, tabela de cargos, sumário. Só mexa aqui
  para mudar a moldura da página, nunca para adicionar conteúdo.
- `src/components/tutorial-section.tsx` — renderiza uma seção.
- `src/components/role-badge.tsx` + `src/lib/role-labels.ts` — os selos de cargo.
- `public/ajuda/*.webp` — as capturas. `public/ajuda/exemplo.adi` — o arquivo de
  exemplo linkado na seção de ADIF.
- `src/app/ajuda/content.test.ts` — a trava.

**Conteúdo é dado, não JSX.** Isso não é preferência estética: é o que permite ao
teste percorrer todas as imagens e provar que existem. Prosa em TSX não é
testável, e uma captura renomeada viraria imagem quebrada em produção sem
quebrar o build.

### `/ajuda` é rota pública

Está na lista de `isPublicRoute` em `src/proxy.ts`. O leitor principal é quem
**ainda não tem conta** — as duas primeiras seções ensinam justamente a se
cadastrar e a entrar. Não feche essa rota: as URLs administrativas são
adivinháveis de qualquer jeito e continuam barradas no servidor, então gatear o
manual não protegeria nada e afastaria o público certo.

### `audiences` é lista explícita, não cargo mínimo

```ts
audiences: ["OPERATOR", "ADMIN", "OWNER"]
```

Nunca troque por um "cargo mínimo" com hierarquia implícita. A matriz de
permissões **não é hierárquica**: o operador só enxerga os eventos em que foi
designado, e a gestão de usuários é exclusiva do Owner mesmo estando "acima" do
Admin. Cargo mínimo obrigaria a mentir num dos dois casos.

O campo `note` existe para o que o selo não conta:

```ts
note: "O operador só enxerga os eventos em que foi designado, e só pode editar
       ou excluir os QSOs que ele mesmo lançou."
```

Se você se pegar explicando escopo dentro do texto de um passo, provavelmente é
`note`.

## Recapturar uma tela

### 1. Subir o ambiente com dados de demonstração

```bash
make up            # Postgres
make db-seed       # bandas, modos, template "Padrão", OWNER PY2ADM/admin123
make db-seed-demo  # um usuário por papel, evento, QSOs
make dev
```

`make db-seed-demo` é aditivo e idempotente, e aborta se o `DATABASE_URL` não
for local. Contas: `PY1DEM` (Admin), `PY2DEM` (Operador, designado ao evento),
`PY3DEM` (Usuário, participante de 4 QSOs) — todas com senha `demo1234`.

⚠️ **Não tente criar conta pela UI.** `registerUser` chama o Resend e a chave do
`.env` local é placeholder: a ação lança exceção e a conta não nasce. O login
também exige `emailVerified`. É exatamente por isso que o seed de demonstração
existe.

### 2. Preparar o navegador

Use o Claude in Chrome. Três ajustes que **não são opcionais**:

- **Janela em 1120×950** (`resize_window`), que produz captura de 1120×807 sem
  área morta. Confira a dimensão que a captura retorna: a janela às vezes volta
  sozinha para outro tamanho, e aí a captura sai em 1568×739.
  ⚠️ Quando isso acontece, **as coordenadas de clique da captura anterior deixam
  de valer** — redimensione, tire uma captura nova e só então clique. Metade dos
  cliques errados vem daqui.
- **Tema claro**, pelo botão de tema da barra. Todas as imagens do manual são
  claras; misturar tema deixa a página com cara de remendo.
  ⚠️ `javascript_tool` é bloqueado em `localhost`, então não dá para gravar o
  `localStorage` direto — tem que clicar. O ícone mostra o tema **destino**, não
  o atual: partindo de "system" num SO escuro são dois cliques até o claro.
- **`devIndicators: false`** temporário em `next.config.ts`. Sem isso, o
  indicador do Next fica no canto inferior esquerdo de toda captura.
  ⚠️ **Reverta antes de commitar.** Deixar ligado esconde de todo mundo a
  informação de rota estática/dinâmica em desenvolvimento.

Antes de cada captura, mande o cursor para um canto vazio (`hover`) — ele
aparece na imagem.

### 3. Capturar e converter

Capture com `save_to_disk: true`; o resultado traz o caminho do `.jpg` em
`/tmp/claude-chrome-screenshots-*/`. Converta com:

```bash
node scripts/shot.mjs <origem.jpg> <nome-sem-extensao> [left top width height]
```

O script recorta, converte para WebP q90 e imprime as dimensões finais — que
são as que vão para `width`/`height` no `content.ts`.

Recorte com intenção:

- **corte a área morta** embaixo (quase toda tela tem);
- **isole o painel** quando a tela inteira encolhida ficar ilegível — o
  formulário de QSO e o resultado do ADIF são dois painéis lado a lado e rendem
  duas imagens muito melhores que uma;
- **corte dados que não são de demonstração.** O banco local costuma ter lixo de
  teste antigo (o evento "Smoke Test #11", por exemplo). Recortar é a saída
  certa — não apague dado do banco do desenvolvedor para tirar uma foto.

### 4. Nomear

`public/ajuda/NN-slug.webp`, com `NN` em dezenas por papel:

```
10s  público / sem login
20s  usuário
30s  operador
40s  admin
50s  owner
```

As dezenas deixam espaço para inserir sem renumerar tudo — renumerar quebraria
todas as referências no `content.ts` de uma vez.

### 5. Certificados não são captura de tela

Baixe o PNG real do endpoint público — sai nítido, sem a moldura do navegador e
sem a compressão intermediária do JPEG da captura:

```bash
curl -s -o /tmp/cert.png \
  "http://localhost:3000/api/verificar-certificado/demo-evt-atual/PY3DEM"
node scripts/shot.mjs /tmp/cert.png 26-certificado-participante
```

O de operador é `/api/verificar-certificado/operador/demo-evt-atual/PY2DEM`.

## Estados de tela que dão trabalho

Alguns painéis só existem depois de uma interação. O que cada um exige, e como
não deixar sujeira:

**2FA (códigos de recuperação e estado ativo).** Clique em "Ativar 2FA", copie o
segredo exibido e gere o código com o `otplib` que já é dependência do projeto:

```bash
node --input-type=module -e "
import { generateSync } from 'otplib';
console.log(generateSync({ secret: '<SEGREDO>' }),
            '| restam:', 30 - (Math.floor(Date.now()/1000) % 30));
"
```

Se restarem menos de ~15 s, espere a próxima janela — digitar um código
expirando gasta uma ida e volta à toa. Códigos já aceitos são rejeitados por
anti-replay, então cada etapa precisa de um código de uma janela nova.

⚠️ **Desative o 2FA ao terminar.** Conta de demonstração com 2FA ligado obriga
autenticador em todo login seguinte e trava o próximo trabalho de captura.

**Importação ADIF.** Envie `public/ajuda/exemplo.adi` — ele é construído para
produzir o resumo completo: 4 importados, 1 duplicado, 2 rejeitados. O duplicado
é um registro repetido **dentro do próprio arquivo**, de propósito: assim o
resultado não depende dos horários do seed, que são relativos à data de execução.

⚠️ A importação insere QSOs de verdade e muda a contagem do evento, o que faz as
outras imagens (ranking, "12 QSOs lançados") passarem a discordar entre si.
Limpe depois:

```bash
docker compose exec -T db psql -U grasp -d grasp_cert \
  -c "delete from qsos where event_id='demo-evt-atual' and id not like 'demo-qso-%';"
```

**Regra geral:** se a captura exigiu mutação, desfaça a mutação. As imagens do
manual são um conjunto e precisam contar a mesma história — número de QSOs,
lista de eventos e ranking têm que fechar entre elas.

## Escrever a seção

Formato de um passo:

```ts
{
  text: "Frase única, imperativa, dizendo o que fazer e o que esperar.",
  shot: {
    src: "/ajuda/31-qsos-do-evento.webp",
    alt: "Descrição da tela e do controle em questão",
    width: 1120,
    height: 800,
    caption: "Detalhe que a imagem não explica sozinha.", // opcional
  },
}
```

- **`width`/`height` são os do arquivo**, como o `scripts/shot.mjs` imprimiu. O
  componente usa `maxWidth: shot.width` para nunca ampliar: captura de painel
  estreito esticada até a coluna fica borrada.
- **`alt` em português, descrevendo a tela e o controle** — "Tela Meus
  Certificados com o cartão do evento e os botões de download", não "captura de
  tela". É o que o leitor de tela vai ler.
- **Nem todo passo precisa de imagem.** Passo que é só uma regra ("contatos
  repetidos são ignorados") fica melhor sem. Cada imagem é passivo de manutenção.
- **Não descreva a imagem no texto.** O texto diz o que fazer; a imagem mostra
  onde. Repetir os dois dobra o trabalho de atualização.
- **Documente a armadilha onde ela aparece.** A exclusão de evento não pede
  confirmação e leva os QSOs junto — isso está escrito no passo correspondente,
  e é o tipo de coisa que justifica o manual existir.

## Antes de terminar

```bash
pnpm lint
make test      # content.test.ts prova que toda imagem referenciada existe
pnpm build
```

E confira no navegador, **deslogado**, que `/ajuda` abre sem redirecionar:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/ajuda   # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/events  # 307 → /login
```

O segundo comando é o teste que importa de verdade: o manual **documenta sem
liberar**. Um usuário comum vê todas as seções, inclusive as de Owner, marcadas
com o cargo — e continua barrado nas rotas.

## Rumos

O que fazer quando o manual crescer, e o que **não** fazer.

**Página única até deixar de ser navegável.** Hoje são 11 seções e o Ctrl+F
resolve. O sinal de que passou do ponto não é o número de seções, é o leitor não
achar o que quer pelo sumário. Quando chegar lá, **divida por público** (visitante
/ participante / operador / administração), não por funcionalidade — quem lê está
procurando "o que eu consigo fazer", não "que telas existem".

**Não deixe virar documentação técnica.** Arquitetura, modelo de dados e
armadilhas de implementação vão para o `AGENTS.md`. Se um parágrafo do manual só
faz sentido para quem lê o código, ele está no arquivo errado.

**Menos imagens, melhor escolhidas.** Cada captura é um compromisso de
manutenção que ninguém lembra de honrar. Antes de acrescentar uma, pergunte se o
leitor erraria o caminho sem ela.

**Endereço de produção nas imagens.** As capturas atuais mostram
`http://localhost:3000` no rodapé do certificado e no QR Code, porque saíram do
ambiente local. Quando houver domínio definitivo, aponte o `NEXT_PUBLIC_APP_URL`
para ele e gere de novo só as duas imagens de certificado — são as únicas onde a
URL aparece.

**Links profundos das telas para o manual** (ex.: o painel de importação apontando
para `/ajuda#adif`) foram deliberadamente deixados de fora: cada link é um slug a
manter sincronizado, espalhado por vários arquivos, e a entrada fixa no menu já
resolve o acesso. Se um dia valer a pena, o candidato mais forte é o ADIF, que é
a parte mais confusa do produto.

**Idioma.** O sistema é pt-BR e o manual acompanha. Versão em inglês só se houver
demanda real — manual bilíngue desatualizado é pior que manual só em português.

**Não versione o manual** (v1, v2, changelog). Ele descreve o sistema como ele é
agora; histórico é o que o git guarda. Manual com versões cria a dúvida sobre
qual delas está valendo.
