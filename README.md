# Royal Bunker Steam Farmer

Cliente de terminal para manter jogos selecionados da sua biblioteca Steam em atividade.

## Recursos

- Painel de terminal leve
- Compatível com Linux, VPS e Termux
- Seleção por AppID
- Reconexão automática
- Detecção de outra sessão ativa
- Steam Guard
- Sistema de licença preparado para validação online
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

A versão distribuída pode usar uma licença vinculada ao dispositivo e validada pelo servidor.

Planos planejados:

- 7 dias — R$20
- 30 dias — R$60
- 365 dias — R$100

A licença deve ser validada pelo servidor antes do farming. Licenças expiradas ou revogadas são recusadas.

O cliente não contém uma chave administrativa ou segredo do servidor. A geração, renovação e revogação devem ficar no serviço privado de licenciamento.

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

Não publique seu arquivo `.env`, `license.json` ou credenciais do Steam. Nunca compartilhe códigos do Steam Guard.

## Código e licença

Este projeto é distribuído sob MIT. Parte da implementação deriva de trabalho originalmente publicado por tacheometry no projeto steam-hour-farmer. Os avisos de copyright e os termos da licença original permanecem em `LICENSE.md`.

## Suporte

O tutorial e o suporte da versão comercial podem ser oferecidos pelo Discord do Royal Bunker.
