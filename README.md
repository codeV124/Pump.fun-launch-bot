# Pumpfun_launch_bot
Pumpfun launch & sniper bot using jito

## Screenshots

- Create new SPL token on Pump.fun

    CA: [9DQZcmv3PFezYa4itDC5NCia4vWV6LKNNShNtciwqSZM](https://pump.fun/9DQZcmv3PFezYa4itDC5NCia4vWV6LKNNShNtciwqSZM)

- Create & buy

    [3uBwg8JRepis9HuKPFUW8joavo4CdkUGmZMciY1U7CSMEjvMbMfremZmomvg6SgyNTLPzMzWg3GiWSbxcT5hybir](https://solscan.io/tx/3uBwg8JRepis9HuKPFUW8joavo4CdkUGmZMciY1U7CSMEjvMbMfremZmomvg6SgyNTLPzMzWg3GiWSbxcT5hybir)
    
- Sell

    [mEwTYYe7vctyDRF57AY7aJUAmggbYXApGhfnEDJqrvsSgdBJyujMNBDbfHFizKBem5kRQXDMCWtcMt8VFg8ymHk](https://solscan.io/tx/mEwTYYe7vctyDRF57AY7aJUAmggbYXApGhfnEDJqrvsSgdBJyujMNBDbfHFizKBem5kRQXDMCWtcMt8VFg8ymHk)

## Features

1. Create & buy new SPL token in the same transaction on Pump.fun
2. Buy all SPL token balance as soon as possible.
3. Create new wallet and repeat the above actions.
4. Retrieve all SOL balance to the main wallet.

## How to use

1. Clone the repository

    ```sh
    git clone https://github.com/btcoin23/pumpfun_launch_bot.git
    ```

2. Install dependencies

    ```sh
    yarn install
    ```

3. Create and edit `.env` file

    ```sh
    PRIVATE_KEY=
    RPC_URL=
    ```

4. Set your configuration on `config.ts` file

    ```sh
    export const splMetaData = {
        name: '',
        symbol: '',
        url: ''
    }// SPL token metadata

    export const buyAmount = 0.1 * LAMPORTS_PER_SOL; // first buy amount
    export const jitoTip = 0.001 * LAMPORTS_PER_SOL; // jito tip 

    export const duration_buy = 10 * 1000; // 10s before new buy
    export const duration_sell = 100; // 100ms before sell
    export const max_n = 5; // do buy/sell max_n times
    ```

5. Run the bot

    ```sh
    npm start
    ```

## Author

- [Telegram](https://t.me/jupiter117)
