# Como colocar o protótipo no ar (grátis, ~10 minutos)

O app roda dentro de uma **Planilha Google**. A planilha guarda os agendamentos e o Google hospeda o site de graça. Não precisa de domínio, servidor nem cartão.

Faça isso com a conta Google que vai "ser dona" do app (pode ser a sua; a manicure não precisa de conta).

## 1. Criar a planilha
1. Abra https://sheets.new e dê o nome, por exemplo, "Agenda - Studio da Fulana".

## 2. Colar o código
1. Na planilha: **Extensões > Apps Script**.
2. No arquivo `Code.gs` que já existe, apague tudo e cole o conteúdo de `Code.gs` desta pasta.
3. Clique no **+** ao lado de "Arquivos" > **HTML** > nome: `index` (sem .html). Apague o que vier e cole o conteúdo de `index.html` desta pasta.
4. Clique em **Salvar** (ícone de disquete).

## 3. Publicar
1. **Implantar > Nova implantação**. Na engrenagem, escolha **App da Web**.
2. Executar como: **Eu**. Quem pode acessar: **Qualquer pessoa**.
3. **Implantar** e autorize (o Google mostra um aviso de "app não verificado": clique em *Avançado > Acessar*; é o seu próprio script).
4. Copie a **URL do app da Web** (termina em `/exec`). Esse é o link que vai para as clientes.

## 4. Configurar o salão
1. Abra o link, role até o fim e toque em **Área da manicure**. PIN inicial: **1234**.
2. Em **Meu salão**: nome, cor, logo, serviços, preços, horários, **chave Pix do sinal**, política de cancelamento, fotos dos trabalhos e **troque o PIN**. Salve.
3. Os agendamentos aparecem no painel e também na aba **Agendamentos** da planilha.

## Para atualizar o código depois
Cole a versão nova e vá em **Implantar > Gerenciar implantações > lápis > Versão: Nova versão > Implantar**. O link continua o mesmo.

## Um salão novo = uma planilha nova
Para cada cliente (salão), repita o passo a passo numa planilha nova. É assim que cada salão tem o "seu app".

## Limitações conhecidas (é um protótipo)
- O Google mostra uma faixa no topo: "Este aplicativo foi criado por um usuário do Google Apps Script". Some quando migrarmos para domínio próprio.
- A cliente não recebe lembrete automático. A manicure manda com 1 toque pelo botão "Lembrete no WhatsApp".
- Cancelar/remarcar é pelo WhatsApp do salão (a cliente não tem login).
- O PIN é uma proteção simples, suficiente para teste, não para produção.
- O sinal por Pix é conferido à mão: a cliente paga pelo QR/copia e cola e a manicure marca "Sinal recebido". Não há confirmação automática do banco.
- Se você já tinha instalado a versão 1, crie uma planilha nova (a v2 tem uma coluna "sinal" a mais).

---

# Publicar na Vercel (endereço grátis .vercel.app)

O app (as telas) fica na Vercel e os dados continuam na Planilha Google. Os arquivos estão na pasta `site/`.

1. **GitHub:** crie um repositório vazio (ex.: `agenda-unhas`). O Claude envia os arquivos da pasta `site/` para ele.
2. **Vercel:** entre em https://vercel.com com a conta do GitHub > **Add New... > Project** > escolha `agenda-unhas` > em *Project Name* escreva o nome que vira o endereço (ex.: `agendaunhas` → `agendaunhas.vercel.app`) > **Deploy**.
3. **Ligar na planilha:** faça os passos 1 a 3 lá de cima (planilha + Apps Script + implantar) e copie a URL que termina em `/exec`. Coloque essa URL no arquivo `config.js`, entre as aspas. Enquanto estiver vazio, o app roda em modo demonstração.
4. Toda alteração enviada ao GitHub é publicada sozinha pela Vercel.

**No celular:** abra o endereço e use "Adicionar à tela de início". O app ganha ícone e abre em tela cheia, como um app instalado.

**Domínio próprio depois:** Vercel > projeto > Settings > Domains > adicione o domínio e siga as instruções de DNS.
