# Monde API V3 — Referência Completa

> **IMPORTANTE:** Esta documentação deve ser consultada ANTES de modificar qualquer código de integração Monde.
> Fonte: Documentação oficial Monde (suporte@monde.com.br)
> Última atualização: 2026-02-12

## Informações Gerais

| Campo | Valor |
|-------|-------|
| **URL Base** | `https://web.monde.com.br/api/v3` |
| **Autenticação** | HTTP Basic Auth |
| **Formato** | JSON (RESTful) |
| **Datas** | ISO 8601 (`YYYY-MM-DD`) |
| **Floats** | Ponto como separador decimal, 2 casas (`99999.99`) |
| **Idempotência** | UUID v4 no header `Idempotency-Key` (válida 1 dia) |
| **Rate Limit** | 60 req / 3 segundos por IP |

## Autenticação

```
Authorization: Basic <base64(username:password)>
```

Credenciais fornecidas pela agência. Não expiram, podem ser revogadas.

## Idempotência

- Header: `Idempotency-Key: <UUID v4>`
- Mesma chave + mesmo body = resposta em cache (`X-Idempotent-Replay: true`)
- Mesma chave + body diferente = `422 Unprocessable Content`
- Requisição em andamento com mesma chave = `409 Conflict`

---

## POST /sales — Cadastrar Venda

> A venda deve conter **pelo menos um produto**.

### Campos do Request Body

| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| `company_identifier` | string (14 chars) | **SIM** | CNPJ da agência (só dígitos). Ex: `"46598887000162"` |
| `sale_date` | string (date) | **SIM** | Data da venda. Ex: `"2026-02-12"` |
| `operation_id` | string | não | ID da operação própria |
| `travel_agent` | object | **SIM** | Agente de viagem responsável pela venda |
| `payer` | object | **SIM** | Contratante/pagante do produto |
| `intermediary` | object | não | Intermediário (operadora/consolidadora) |
| `insurances` | array | não | Seguro viagem |
| `cruises` | array | não | Cruzeiro |
| `hotels` | array | não | Diárias de hospedagem |
| `airline_tickets` | array | não | Passagem aérea |
| `train_tickets` | array | não | Bilhete de trem |
| `ground_transportations` | array | não | Transporte terrestre |
| `car_rentals` | array | não | Locação de veículos |
| `travel_packages` | array | não | Pacotes turísticos |
| `payments` | array | não | Pagamentos realizados |

### travel_agent (REQUIRED)

```json
{
  "external_id": "a8a41bec-e2a2-4d6a-b2f9-8fbc29169e46",
  "name": "João da Silva",
  "cpf": "83115137168"
}
```

| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| `external_id` | string (uuid) | não | ID externo do agente |
| `name` | string | **SIM** | Nome do agente |
| `cpf` | string (11 chars) | não | CPF do agente (só dígitos) |

### payer (REQUIRED) — individual_or_company

```json
{
  "person_kind": "individual",
  "external_id": "cce45f2c-30e3-43a6-bbf1-af340188a04c",
  "name": "Márcio da Veiga",
  "legal_name": null,
  "gender": "male",
  "birthdate": "1990-02-12",
  "cpf_cnpj": "50957153848",
  "rg_ie": "202571476",
  "passport_number": "BC826174",
  "passport_expiration_date": "2030-07-15",
  "foreigner": false,
  "foreign_identity_document": null,
  "email": "contato@marcio.com",
  "phone_number": "11999990001",
  "mobile_number": "11999990002",
  "address": {}
}
```

| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| `person_kind` | string | **SIM** | `"individual"` ou `"company"` |
| `external_id` | string (uuid) | não | ID externo |
| `name` | string | **SIM** | Nome (PF) ou Razão Social (PJ) |
| `legal_name` | string | não | Nome fantasia (PJ) |
| `gender` | string | não | `"male"`, `"female"` |
| `birthdate` | string (date) | não | Data de nascimento |
| `cpf_cnpj` | string | não | CPF (11 dígitos) ou CNPJ (14 dígitos) |
| `rg_ie` | string | não | RG ou Inscrição Estadual |
| `passport_number` | string | não | Número do passaporte |
| `passport_expiration_date` | string (date) | não | Validade do passaporte |
| `foreigner` | boolean | não | Se é estrangeiro |
| `foreign_identity_document` | string | não | Documento de identidade estrangeiro |
| `email` | string | não | Email |
| `phone_number` | string | não | Telefone fixo |
| `mobile_number` | string | não | Celular |
| `address` | object | não | Endereço |

### intermediary (opcional) — mesma estrutura de individual_or_company

### Resposta 201 — Sucesso

```json
{
  "sale_id": "9f8e7d6c-5b4a-3210-9876-5432109876ab",
  "sale_number": 987,
  "company_identifier": "46598887000162",
  "sale_date": "2026-02-12",
  "period_start": "2024-03-15",
  "period_end": "2024-03-22",
  "operation_id": "WC-abc123de",
  "travel_agent": { ... },
  "payer": { ... },
  ...
}
```

---

## Tipos de Produto (no payload de venda)

### hotels — Diárias de hospedagem

| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| `check_in` | string (date) | **SIM** | Data check-in |
| `check_out` | string (date) | **SIM** | Data check-out |
| `supplier_name` | string | **SIM** | Nome do hotel/fornecedor |
| `city` | string | não | Cidade |
| `rooms` | integer | não | Número de quartos |
| `daily_quantity` | integer | não | Número de diárias |
| `value` | float | **SIM** | Valor total |

### airline_tickets — Passagem aérea

| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| `departure_date` | string (date) | **SIM** | Data de partida |
| `arrival_date` | string (date) | não | Data de chegada |
| `origin` | string | **SIM** | Código aeroporto origem |
| `destination` | string | **SIM** | Código aeroporto destino |
| `locator` | string | não | Localizador/número voo |
| `supplier_name` | string | **SIM** | Companhia aérea |
| `value` | float | **SIM** | Valor total |

> Bilhetes com mesmo `locator` e `sale_date` são agrupados automaticamente.

### ground_transportations — Transporte terrestre

| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| `date` | string (date) | **SIM** | Data do serviço |
| `origin` | string | não | Local de origem |
| `destination` | string | não | Local de destino |
| `supplier_name` | string | não | Fornecedor |
| `value` | float | **SIM** | Valor total |

### insurances — Seguro viagem

| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| `start_date` | string (date) | **SIM** | Data início cobertura |
| `end_date` | string (date) | não | Data fim cobertura |
| `supplier_name` | string | não | Seguradora |
| `value` | float | **SIM** | Valor total |

### cruises — Cruzeiro

| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| `departure_date` | string (date) | **SIM** | Data de partida |
| `arrival_date` | string (date) | não | Data de chegada |
| `supplier_name` | string | **SIM** | Companhia de cruzeiro |
| `value` | float | **SIM** | Valor total |

### train_tickets — Bilhete de trem

| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| `departure_date` | string (date) | **SIM** | Data de partida |
| `origin` | string | **SIM** | Estação/cidade origem |
| `destination` | string | **SIM** | Estação/cidade destino |
| `supplier_name` | string | não | Companhia ferroviária |
| `value` | float | **SIM** | Valor total |

### car_rentals — Locação de veículos

| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| `pickup_date` | string (date) | **SIM** | Data retirada |
| `return_date` | string (date) | não | Data devolução |
| `pickup_location` | string | não | Local de retirada |
| `return_location` | string | não | Local de devolução |
| `supplier_name` | string | **SIM** | Locadora |
| `value` | float | **SIM** | Valor total |

### travel_packages — Pacotes turísticos

| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| `start_date` | string (date) | **SIM** | Data início |
| `end_date` | string (date) | não | Data fim |
| `supplier_name` | string | **SIM** | Fornecedor/operadora |
| `description` | string | não | Descrição do pacote |
| `value` | float | **SIM** | Valor total |

### payments — Pagamentos

| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| `external_id` | string | não | ID externo para correspondência com produtos |
| `method` | string | não | Método (cartão, boleto, etc.) |
| `value` | float | **SIM** | Valor do pagamento |

---

## GET /sales — Listar vendas

Query params: `period_start`, `period_end`, `page`, `size`

## GET /sales/{sale_id} — Obter venda por ID

## POST /attachments — Enviar anexo

- `target_type`: `"sale"`
- `target_id`: UUID da venda
- `file`: binário (max 12MB, extensões: pdf, doc, xlsx, jpg, png, etc.)
- `description`: texto opcional

## GET /products — Listar produtos

Query param `kind`: `insurance`, `cruise`, `hotel`, `airline_ticket`, `train_ticket`, `ground_transportation`, `car_rental`, `travel_package`, `operation`, `others`

---

## Exemplo Completo — Venda com todos os produtos

```json
{
  "company_identifier": "46598887000162",
  "sale_date": "2026-02-12",
  "travel_agent": {
    "external_id": "a8a41bec-e2a2-4d6a-b2f9-8fbc29169e46",
    "name": "João da Silva",
    "cpf": "83115137168"
  },
  "payer": {
    "person_kind": "individual",
    "external_id": "cce45f2c-30e3-43a6-bbf1-af340188a04c",
    "name": "Márcio da Veiga",
    "gender": "male",
    "birthdate": "1990-02-12",
    "cpf_cnpj": "50957153848",
    "email": "contato@marcio.com",
    "mobile_number": "11999990002"
  },
  "hotels": [{
    "check_in": "2026-03-01",
    "check_out": "2026-03-05",
    "supplier_name": "Hotel Copacabana Palace",
    "city": "Rio de Janeiro",
    "rooms": 1,
    "value": 5000.00
  }],
  "airline_tickets": [{
    "departure_date": "2026-03-01",
    "origin": "GRU",
    "destination": "GIG",
    "locator": "AA1234",
    "supplier_name": "LATAM",
    "value": 1200.00
  }],
  "ground_transportations": [{
    "date": "2026-03-01",
    "origin": "Aeroporto GIG",
    "destination": "Hotel Copacabana Palace",
    "supplier_name": "Transfer Service",
    "value": 150.00
  }],
  "insurances": [{
    "start_date": "2026-03-01",
    "end_date": "2026-03-05",
    "supplier_name": "Assist Card",
    "value": 250.00
  }],
  "travel_packages": [{
    "start_date": "2026-03-01",
    "end_date": "2026-03-05",
    "supplier_name": "CVC",
    "description": "Pacote Rio de Janeiro 5 dias",
    "value": 8000.00
  }],
  "car_rentals": [{
    "pickup_date": "2026-03-01",
    "return_date": "2026-03-05",
    "pickup_location": "Aeroporto GIG",
    "supplier_name": "Localiza",
    "value": 600.00
  }]
}
```

---

## Mapeamento WelcomeCRM → Monde

| Campo WelcomeCRM | Campo Monde | Fonte |
|------------------|-------------|-------|
| `MONDE_CNPJ` (integration_settings) | `company_identifier` | Config |
| `monde_sales.sale_date` | `sale_date` | Mondo sale |
| `cards.vendas_owner_id` → profiles | `travel_agent.name` | Card owner |
| `cards.pessoa_principal_id` → contatos | `payer.name/cpf/email` | Card contato |
| `WC-{card_id[0:8]}` | `operation_id` | Generated |
| `proposal_items.item_type` | Tipo do produto | Proposal |
| `card_financial_items.product_type` | Tipo do produto | Financial item |
