### How to Test for Creating Token and Minting Token to Other Wallet

Since the program utilizes the Metaplex program, deployment to the Devnet network is required.

1. **Configure Solana URL to Devnet**
    ```sh
    solana config set --url https://api.devnet.solana.com
    ```

2. **Build Program**
    ```sh
    anchor build
    ```

3. **Airdrop SOL to Address**
    - To deploy the `mint_token` program, ensure you have 2-3 SOL in the wallet which stores the `wallet.json` file.
    - Get the address of the wallet:
        ```shell
        solana address --keypair wallet.json
        ```
    - Airdrop to another address:
        ```shell
        solana airdrop 2 <address>
        ```
    - Check the balance of the address:
        ```shell
        solana balance <address>
        ```

4. **Deploy Program**
    ```sh
    anchor deploy
    ```

5. **Test Program**
    ```sh
    anchor test --skip-deploy
    ```

