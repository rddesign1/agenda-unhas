# WhatsApp automático: confirmação e lembrete

Quando estiver ligado, a cliente recebe duas mensagens pelo número do salão:

1. **Confirmação**, na hora em que agenda.
2. **Lembrete**, umas 24 horas antes do horário (a planilha confere de hora em hora).

O envio usa a **API oficial do WhatsApp (Meta)**, então o número não corre risco de bloqueio. A coluna `whatsapp` da aba Agendamentos mostra o que foi enviado e quando.

## Quanto custa
- **Fase de teste: grátis.** A Meta dá um número de teste que pode mandar mensagens para até 5 números cadastrados por você.
- **Uso real:** a Meta cobra alguns centavos por mensagem de confirmação ou lembrete. É preciso cadastrar um cartão na conta da Meta. Os preços atuais ficam no painel da Meta, em Pagamentos.

## Passo a passo (você faz, eu acompanho)

### 1. Criar o app na Meta
1. Entre em **developers.facebook.com** com o seu Facebook e clique em **Meus apps > Criar app**.
2. Escolha o caso de uso **"Conectar-se com clientes pelo WhatsApp"** (ou tipo **Empresa**) e conclua.
3. No app, abra **WhatsApp > Configuração da API**.

### 2. Pegar os dois códigos
Nessa tela aparecem:
- **ID do número de telefone**: um número comprido. Copie.
- **Token de acesso temporário**: vale 24 horas, serve para o primeiro teste. Copie.
- Em **Para**, cadastre o seu WhatsApp (e de quem mais for testar, até 5). A Meta manda um código para confirmar.

### 3. Criar os 2 modelos de mensagem
Em **WhatsApp Manager > Modelos de mensagem > Criar modelo**. Categoria **Utilidade**, idioma **Português (BR)**.

**Nome:** `confirmacao_agendamento`

> Olá, {{1}}! Seu horário de {{2}} no {{5}} está confirmado para {{3}} às {{4}}. Se precisar remarcar, é só responder esta mensagem.

**Nome:** `lembrete_agendamento`

> Oi, {{1}}! Passando para lembrar do seu horário de {{2}} amanhã, {{3}}, às {{4}}, no {{5}}. Até lá!

As variáveis são preenchidas sozinhas: {{1}} primeiro nome da cliente, {{2}} serviço, {{3}} data (ex.: 28/11), {{4}} horário, {{5}} nome do salão. Na hora de criar, a Meta pede um exemplo para cada variável: use, por exemplo, Ana, Manicure, 28/11, 14:00, Studio Alessandra. A aprovação costuma levar de minutos a algumas horas.

### 4. Ligar no app
No app, entre em **Sou a manicure > Meu salão > WhatsApp automático**:
1. Cole o **ID do número de telefone** e o **token**.
2. Marque **Enviar confirmação e lembrete automaticamente** e toque em **Salvar WhatsApp**.
3. Digite o seu WhatsApp em **Enviar teste para** e toque em **Enviar teste**. Deve chegar a mensagem de confirmação.

O token fica guardado só no Google (nas propriedades do script), nunca aparece para as clientes.

### 5. Deixar definitivo (antes de usar com clientes de verdade)
- **Token que não expira:** em **business.facebook.com > Configurações > Usuários do sistema**, crie um usuário Admin, clique em **Gerar token**, escolha o app, marque `whatsapp_business_messaging` e `whatsapp_business_management` e validade **Nunca**. Cole esse token no app no lugar do temporário.
- **Número do salão:** em **WhatsApp > Configuração da API > Adicionar número de telefone**. O número não pode estar em uso no app WhatsApp comum (use um chip novo ou migre o número).
- **Pagamento:** cadastre um cartão em **WhatsApp Manager > Pagamentos**.

## Se der erro
O cartão do WhatsApp no painel mostra o **último erro** que a Meta devolveu. Os mais comuns:
- *Template name does not exist*: o modelo ainda não foi aprovado ou o nome está diferente.
- *Recipient phone number not in allowed list*: no número de teste, cadastre o destino em "Para".
- *Error validating access token*: o token temporário venceu (24h). Gere outro ou use o definitivo.
