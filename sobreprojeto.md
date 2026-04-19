# 📌 Visão Geral do Sistema

O **SmartRoute** é um sistema desenvolvido para motoristas de vans escolares, com o objetivo de **organizar, automatizar e otimizar a gestão diária dos alunos e das rotas**.

Ele resolve um problema muito comum no transporte escolar: a **falta de confirmação antecipada** de quais alunos irão utilizar o transporte, o que gera atrasos, rotas desnecessárias e perda de tempo.

---

# 🎯 Objetivo Principal

O principal objetivo do sistema é:

- 👉 Automatizar o processo de confirmação de presença dos alunos utilizando o **WhatsApp** como canal de comunicação  
- 👉 Ajudar o motorista a **planejar melhor sua rota e rotina diária**, com base nas respostas recebidas  

---

# ⚙️ Funcionamento Geral

O sistema funciona de forma simples:

1. O motorista envia uma mensagem automática via WhatsApp  
2. O usuário responde com um número (ex: **1, 2, 3 ou 4**)  
3. O sistema interpreta a resposta como:

   - 1 → Ida e volta  
   - 2 → Somente ida  
   - 3 → Somente volta  
   - 4 → Não vai  

4. As informações são registradas automaticamente  
5. O sistema organiza os dados em uma lista diária  
6. Auxilia na definição da rota  

---

# 🚀 Principais Funcionalidades

## 👤 Gestão de Motorista
- Login e autenticação  
- Cadastro e gerenciamento de passageiros  
- Visualização de lista diária e rotas  

## 🧍 Gestão de Passageiros
- Cadastro completo (nome, telefone, endereço, turno, etc.)  
- Ativação e inativação  
- Histórico de presença  

## 📅 Lista Diária
- Geração automática da lista do dia  
- Separação de:
  - Confirmados  
  - Pendentes  
  - Ausentes  
- Cálculo de taxa de ocupação  

## ✅ Confirmação de Presença
- Registro automático via WhatsApp  
- Tipos de confirmação (ida/volta/etc.)  
- Controle de status:
  - Confirmado  
  - Pendente  
  - Ausente  
- Origem da confirmação:
  - Manual  
  - WhatsApp  

## 📍 Roteirização
- Geração de rotas baseada nos alunos confirmados  
- Ordenação de paradas por horário  
- Organização das paradas (endereços)  

## 📱 Integração com WhatsApp
- Conexão via instância (QR Code, sessão, etc.)  
- Envio e recebimento de mensagens  
- Processamento automático das respostas  
- Controle de status de envio  

## 🤖 Automação
- Configuração de envio automático de mensagens  
- Definição de horários:
  - Envio  
  - Limite de resposta  
- Controle de tentativas e intervalos  

## 📝 Templates de Mensagem (DIFERENCIAL)
- Personalização da mensagem enviada  
- Definição de cabeçalho e rodapé  
- Criação de opções numeradas (1 a 4)  
- Flexibilidade para o motorista adaptar o texto  

## 📊 Histórico e Relatórios
- Registro de presença por data  
- Cálculo de frequência dos alunos  
- Dados para análise e tomada de decisão  

## 📨 Controle de Mensagens
- Histórico de mensagens enviadas  
- Status:
  - Enviada  
  - Entregue  
  - Falha  
- Registro de logs de eventos  

---

# 💡 Diferenciais do Sistema

- Uso do **WhatsApp**, ferramenta já conhecida pelos usuários  
- Processo simples (responder com número)  
- Automação sem complicação  
- Personalização das mensagens  
- Foco em resolver um problema real do dia a dia  

---

# 🧠 Problema que o Sistema Resolve

O SmartRoute resolve principalmente:

- Falta de organização no transporte escolar  
- Comunicação desorganizada com responsáveis  
- Incerteza sobre presença dos alunos  
- Perda de tempo e rotas ineficientes  
- Uso de métodos manuais (papel, planilhas, etc.)  

---

# 📈 Resultado Esperado

Com o uso do sistema, o motorista consegue:

- Saber antes de sair de casa quem vai usar o transporte  
- Evitar paradas desnecessárias  
- Reduzir atrasos  
- Ter mais controle e organização  
- Profissionalizar o serviço  

---

# 🧩 Resumão em uma frase

👉 O **SmartRoute** é um sistema que automatiza a confirmação de presença de alunos via WhatsApp e organiza rotas e passageiros para tornar o transporte escolar mais eficiente.