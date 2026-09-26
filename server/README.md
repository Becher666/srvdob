# Royal Bunker License Server

Servidor privado das licenças do Royal Bunker Steam Farmer.

## Requisitos

Node.js 18+.

## Configuração

Copie `server/.env.example` para `.env` na raiz do projeto e defina um `RB_ADMIN_TOKEN` forte.

Nunca publique o `.env` nem `server/licenses.json`.

## Executar

```bash
npm run license-server
```

## Planos

- `7` = 7 dias
- `30` = 30 dias
- `365` = 365 dias
- `lifetime` = vitalício

## API pública

`POST /v1/licenses/validate`

A primeira validação vincula a licença ao dispositivo. Outro dispositivo recebe `DEVICE_MISMATCH`.

## API administrativa

Use o header:

`Authorization: Bearer SEU_RB_ADMIN_TOKEN`

Rotas:

- `POST /v1/admin/licenses/generate`
- `POST /v1/admin/licenses/revoke`
- `POST /v1/admin/licenses/renew`
- `POST /v1/admin/licenses/reset-device`
- `GET /v1/admin/licenses`

A chave completa é retornada somente no momento da geração. O servidor guarda apenas o hash da chave.
