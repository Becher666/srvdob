# Royal Bunker Steam Farmer

Cliente de terminal para manter jogos selecionados da sua biblioteca Steam em atividade.

## Recursos

- Painel de terminal leve
- Compatível com Linux, VPS e Termux
- Seleção por AppID
- Reconexão automática
- Detecção de outra sessão ativa
- Steam Guard
- Configuração simples por .env
- Comandos `rb` e `royal-bunker`

## Instalação

Requer Node.js 16 ou superior.

    git clone https://github.com/Becher666/srvdob.git
    cd srvdob
    npm install

Crie o arquivo `.env`:

    ACCOUNT_NAME="seu_usuario"
    GAMES="730,440"

A senha é solicitada no terminal no momento da inicialização e não é gravada no arquivo de configuração.

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
    nano .env
    npm start

Para manter o processo rodando em segundo plano, use tmux.

## Segurança

Não publique seu arquivo .env e nunca compartilhe credenciais ou códigos do Steam Guard.

## Licença

MIT. A implementação inclui código derivado de trabalho originalmente publicado por tacheometry no projeto steam-hour-farmer. O aviso de copyright e os termos da licença original permanecem em LICENSE.md.
