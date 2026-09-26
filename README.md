# Royal Bunker Steam Farmer

Cliente de terminal para manter jogos selecionados da sua biblioteca Steam em atividade.

## Recursos

- Painel de terminal leve
- Compatível com Linux, VPS e Termux
- Seleção por AppID
- Reconexão automática
- Detecção de outra sessão ativa
- Steam Guard
- Sistema de licença validado online
- Comandos `rb` e `royal-bunker`

## Requisitos

Node.js 18 ou superior.

## Instalação

    git clone https://github.com/Becher666/srvdob.git
    cd srvdob
    npm install

Crie o arquivo `.env` a partir do exemplo:

    ACCOUNT_NAME="seu_usuario"
    GAMES="730,440"
    LICENSE_API_URL="https://seu-servidor"
    LICENSE_KEY="RB-XXXX-XXXX-XXXX"

A senha do Steam é solicitada no terminal e não é salva no arquivo de configuração.

## Licenciamento

Planos:

- 7 dias — R$20
- 30 dias — R$60
- Vitalício — R$100

A licença é validada pelo servidor antes do farming. Licenças expiradas, revogadas ou vinculadas a outro dispositivo são recusadas.

## Servidor de licenças

O servidor fica em `server/license-server.js`.

    npm run license-server

A geração, renovação e revogação usam rotas administrativas protegidas por segredo de servidor. Esse segredo nunca deve entrar no cliente.

## Iniciar

    npm start

Ou instalar o comando:

    npm install -g .
    rb

## Termux

    pkg update
    pkg install nodejs git
    git clone https://github.com/Becher666/srvdob.git
    cd srvdob
    npm install
    cp .env.example .env
    nano .env
    npm start

Para manter o processo rodando em segundo plano, use tmux.

## Segurança

Não publique seu arquivo `.env`, `license.json`, `server/licenses.json` ou credenciais do Steam. Nunca compartilhe códigos do Steam Guard.

## Código e licença

Este projeto é distribuído sob MIT. Parte da implementação deriva de trabalho originalmente publicado por tacheometry no projeto steam-hour-farmer. Os avisos de copyright e os termos da licença original permanecem em `LICENSE.md`.

## Suporte

O tutorial e o suporte da versão comercial podem ser oferecidos pelo Discord do Royal Bunker.
