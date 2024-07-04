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

https://lively-literate-opossum.ngrok-free.app/#id_token=eyJraWQiOiJIaGZBaGdcL1FLVUV1WkJvc2ZCRU5SUlJQMXRMUzBGRTlVRzEwVGZCcmZ1cz0iLCJhbGciOiJSUzI1NiJ9.eyJhdF9oYXNoIjoiSkc4MDEzcXAtRVlrYlBNc2FZTjBHUSIsInN1YiI6IjQ5OGU3NDg4LTYwOTEtNzAyYS04ZTEwLTQ3YzNlZDUxMGQzZCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuYXAtc291dGhlYXN0LTIuYW1hem9uYXdzLmNvbVwvYXAtc291dGhlYXN0LTJfZU1MQU93UEVjIiwiY29nbml0bzp1c2VybmFtZSI6ImxpYmR3cWVldGVxd2UiLCJub25jZSI6ImNYV0E2ak0zU0JYdzc4T0liYzdlek9TWk41dyIsImF1ZCI6IjU5anBsOGRjODJma3A3c2hkZXYzdWhxaWciLCJldmVudF9pZCI6IjYxN2M4YjFlLWRkYjQtNDRkMS1iMjVhLTg4Y2IxNTllYjhlMSIsInRva2VuX3VzZSI6ImlkIiwiYXV0aF90aW1lIjoxNzIwMDc2NTQ4LCJleHAiOjE3MjAwODAxNDgsImlhdCI6MTcyMDA3NjU0OCwianRpIjoiNGIxZmQ3NDYtNzU0NC00YWM5LTg0ZGQtZjExMTcwMTEwYTQ4IiwiZW1haWwiOiJsaWJkYXNkc2RzYTE5ODRAZ21haWwuY29tIn0.IFa_GIdTfZWwmyG-MCrqsbijkUlEVzGqS_mxr8-vtXBVpBHDqYa83DRZ5dA8VlAphju6AA24ehUZ6tyRxg2LdUtPHKoOsIm4vYVngX1FucLk0TueQG4wxfwmIPypT9WfPrjuvo9n1F9dTrrAnMBAOgoC7qBMv_DtcPM59CJkqfk02BG4BwE_6y9XoDLGxcNTHBcQQZcAPwfP075EEcfbTI6hDEGvKKmXdZJJHf0kSby4A24InkCmx2l0yDEM-hggMNVJENGiaEEePiHamu5gysUO-sNibsbGhvsZZ4bp7ihGlB7o0idnKDHDvsOV5ZET9zp7QOlbuTH5MK5O45q-LQ&access_token=eyJraWQiOiJseXA5UUtEZ2tTWmNNVDBcL2p5d3hBS2RqNFVoQ29WXC9kc2tuM01VYUEzaE09IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiI0OThlNzQ4OC02MDkxLTcwMmEtOGUxMC00N2MzZWQ1MTBkM2QiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuYXAtc291dGhlYXN0LTIuYW1hem9uYXdzLmNvbVwvYXAtc291dGhlYXN0LTJfZU1MQU93UEVjIiwidmVyc2lvbiI6MiwiY2xpZW50X2lkIjoiNTlqcGw4ZGM4MmZrcDdzaGRldjN1aHFpZyIsImV2ZW50X2lkIjoiNjE3YzhiMWUtZGRiNC00NGQxLWIyNWEtODhjYjE1OWViOGUxIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJvcGVuaWQgZW1haWwiLCJhdXRoX3RpbWUiOjE3MjAwNzY1NDgsImV4cCI6MTcyMDA4MDE0OCwiaWF0IjoxNzIwMDc2NTQ4LCJqdGkiOiI4OGQ0MWU5Ny02NWRlLTRhMDktODBkZS0zNTU1ZWNlMGRjZGUiLCJ1c2VybmFtZSI6ImxpYmR3cWVldGVxd2UifQ.t_S-m_TCInJR6OVfd43MKeWb7XpAAHAXqL7qZFwUBbYyinkY5ZW1EZmBbUdJPZubXM0R6smV0OOWj2CRk4wRR2bWgZpkD4ECa5bGpI9lg2d2sRFfY05SI-mAT_z1p6iVTLxaSwumpCEvAITbuFCJIpizcgn6aNHtGuzFwtUksEQPupOjuqFlmhzIXbCixhSTr0a8_EffUWtVPWlAhYp9oXLWrxRvWC5a1fy85wCYnsiYYWsSRN1BKPJ4x9hJwbQ24ivHKw6_TMGZzMfynUZ9HDudEstE9N67U38rNGf4k6dJk-lVwUPKlIaLP8Zf69sXhSpirT_AQoOSDdvHCaG15g&expires_in=3600&token_type=Bearer