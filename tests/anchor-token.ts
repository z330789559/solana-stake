import * as anchor from "@coral-xyz/anchor";
import {AnchorProvider, Program} from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { assert } from "chai";
import BN from "bn.js";
import { AnchorToken } from "../app/src/idl/anchor_token";
import  {MintLayout, AccountLayout, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {MetadataJson} from "@metaplex/js";
import  {Metaplex} from "@metaplex-foundation/js";

async function createNftCollect(provider: AnchorProvider, collect: PublicKey, METADATA_SEED: string, TOKEN_METADATA_PROGRAM_ID: PublicKey, mint: PublicKey, stake: PublicKey, collectMetadata: PublicKey, payer: PublicKey, program: Program<AnchorToken>, collect_metadata: {
    symbol: string;
    decimals: number;
    name: string;
    uri: string
}) {
    const info = await provider.connection.getAccountInfo(collect);
    console.log(info)
    if (info) {
        return; // Do not attempt to initialize if already initialized
    }
    console.log("  Mint not found. Attempting to initialize.");
    const collection_master_edition = PublicKey.findProgramAddressSync(
        [
            Buffer.from(METADATA_SEED),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
            Buffer.from("edition"),
        ],
        TOKEN_METADATA_PROGRAM_ID
    );
    // Define the accounts and arguments for the `initToken` function call
    const context = {
        stake,
        metadata: collectMetadata,
        collection: collect,
        payer,
        // metadata: tokenMetadata,
        // mint: collect_mint,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    };

    // Call the `initToken` function to initialize the mint account
    const txHash = await program.methods
        .initNftCollect(collect_metadata)
        .accounts(context)
        .rpc();

    // Wait for confirmation and log transaction details
    await provider.connection.confirmTransaction(txHash, "finalized");
    console.log(`https://explorer.solana.com/tx/${txHash}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);

    // Verify that the mint account was initialized
    const newInfo = await provider.connection.getAccountInfo(collect);
    console.log('newInfo', newInfo)
    const fanoutV0Account = await program.account.stake.fetch(stake);

    console.log('newStake', fanoutV0Account)
}

async function initNft(nft: PublicKey, payer: PublicKey, stake: PublicKey, nftMetadata: PublicKey, masterEditionAccount: PublicKey, collectionMasterEdition: PublicKey, collectMetadata: PublicKey, collect: PublicKey, TOKEN_METADATA_PROGRAM_ID: PublicKey, program: Program<AnchorToken>, nft_metatdata: {
    symbol: string;
    name: string;
    uri: string
}, provider: AnchorProvider) {
    const receive = anchor.utils.token.associatedAddress({
        mint: nft,
        owner: payer,
    });
//stake, nft_mint,receipt_account,metadata_account,master_edition_account,collection_master_edition,
// collection_metadata_account,payer,rent,system_program,associated_token_program,token_program,token_metadata_program

    const context = {
        stake,
        nftMint: nft,
        receiptAccount: receive,
        metadataAccount: nftMetadata,
        masterEditionAccount: masterEditionAccount,
        collectionMasterEdition: collectionMasterEdition,
        collectionMetadataAccount: collectMetadata,
        collection: collect,
        payer,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    };

    const txHash = await program.methods
        .mintNft(nft_metatdata)
        .accounts(context)
        .rpc();
    await provider.connection.confirmTransaction(txHash, "finalized");
    console.log(`  https://explorer.solana.com/tx/${txHash}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);

    const fanoutV0Account = await program.account.stake.fetch(stake);

    console.log('newStake', fanoutV0Account)

    // const receiveInfo = await provider.connection.getAccountInfo(receive);
    // console.log('receiveInfo',receiveInfo)


    const ataAccountInfo = await provider.connection.getParsedAccountInfo(receive);

    if (ataAccountInfo.value) {
        console.log(`receive Account Info: ${JSON.stringify(ataAccountInfo.value.data)}`);
    } else {
        console.log("No data found at the associated address.");
    }
    const metaplex = new Metaplex(provider.connection);


    const nftByMint = await metaplex.nfts().findByMint({mintAddress: nft})
    console.log('nftByMint', nftByMint)

    // const nftBymeta =   await metaplex.nfts().findByMetadata({metadata: nftMetadata})
    // console.log('nftByMint',nftBymeta)

    const receiveNft = await metaplex.nfts().findAllByOwner({owner: receive})
    console.log('nftByMint', receiveNft, "receive", receive, "nft", nft, "nftMetadata", nftMetadata, "stake", stake)

    const metaData = await provider.connection.getAccountInfo(nftMetadata);

    if (metaData) {
        console.log(`ATA Account Info: ${JSON.stringify(metaData.data)}`);
    } else {
        console.log("No data found at the associated address.");
    }

    const largestAccounts = await provider.connection.getTokenLargestAccounts(
        new PublicKey(nft)
    );
    const largestAccountInfo = await provider.connection.getParsedAccountInfo(
        largestAccounts.value[0].address
    );
    console.log("largestAccountInfo", largestAccountInfo.value);
}

describe("anchor-token", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AnchorToken as Program<AnchorToken>;

  // Metaplex Constants
  const METADATA_SEED = "metadata";
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  // Constants from our program
  const MINT_SEED = "mint";
  const COLLECT_SEED = "collect";
  const STAKE = "stake";
  const COLLECT_MINT = "weiland";

  const NFT_SEED = "nft";

  // Data for our tests
  const payer = provider.wallet.publicKey;
  const metadata = {
    name: "Icy",
    symbol: "ICY",
    uri: "https://cdn.discordapp.com/emojis/1192768878183465062.png?size=240&quality=lossless",
    decimals: 9,
  };
  const collect_metadata = {
    name: "IcyC",
    symbol: "ICYC",
    uri: "https://cdn.discordapp.com/emojis/1192768878183465062.png?size=240&quality=lossless",
    decimals: 0,
  }


  const nft_metatdata ={
      name: "NFT",
      symbol: "NFT",
      uri: "https://cdn.discordapp.com/emojis/1192768878183465062.png?size=240&quality=lossless",
  }
  const mintAmount = 10;

  // Derive the public key for our mint account
  const [mint] = PublicKey.findProgramAddressSync(
    [Buffer.from(MINT_SEED)],
    program.programId
  );


  const [collect] = PublicKey.findProgramAddressSync(
    [Buffer.from(COLLECT_SEED)],
    program.programId
  );


  const [stake] = PublicKey.findProgramAddressSync(
    [Buffer.from(STAKE)],
    program.programId
  );


  //nft
    const [nft] = PublicKey.findProgramAddressSync(
        [Buffer.from(NFT_SEED)],
        program.programId
    );
  const [collectMetadata] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_SEED),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collect.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
  const [nftMetadata] =  PublicKey.findProgramAddressSync(
      [
        Buffer.from(METADATA_SEED),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          nft.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
  );
  // Derive the public key for our metadata account using the Metaplex program
  const [metadataAddress] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_SEED),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

    const [masterEditionAccount] =  PublicKey.findProgramAddressSync(
        [
            Buffer.from(METADATA_SEED),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            nft.toBuffer(),
            Buffer.from("edition"),
        ],
        TOKEN_METADATA_PROGRAM_ID
    );
 const [collectionMasterEdition] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_SEED),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      collect.toBuffer(),
      Buffer.from("edition"),
    ],
    TOKEN_METADATA_PROGRAM_ID
    );
    beforeEach(async () => {
     await provider.connection.requestAirdrop(
         provider.wallet.publicKey,
         10000000 * anchor.web3.LAMPORTS_PER_SOL
     );

     const balance = await provider.connection.getBalance(provider.wallet.publicKey);
     console.log(`Airdropped 1 SOL to account ${provider.wallet.publicKey.toBase58()}, balance: ${balance / anchor.web3.LAMPORTS_PER_SOL} SOL`);
     await createNftCollect(provider, collect, METADATA_SEED, TOKEN_METADATA_PROGRAM_ID, mint, stake, collectMetadata, payer, program, collect_metadata);

   await initNft(nft, payer, stake, nftMetadata, masterEditionAccount, collectionMasterEdition, collectMetadata, collect, TOKEN_METADATA_PROGRAM_ID, program, nft_metatdata, provider);
 })

  it.skip("initialize", async () => {
    // Check if the mint account already exists
    const info = await provider.connection.getAccountInfo(mint);
    if (info) {
      return; // Do not attempt to initialize if already initialized
    }
    console.log("  Mint not found. Attempting to initialize.");

    // Define the accounts and arguments for the `initToken` function call
    const context = {
        stake,
      metadata: metadataAddress,
      mint,
      payer,
      rent: SYSVAR_RENT_PUBKEY,
      systemProgram: SystemProgram.programId,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    };

    // Call the `initToken` function to initialize the mint account
    const txHash = await program.methods
      .initToken(metadata)
      .accounts(context)
      .rpc();

    // Wait for confirmation and log transaction details
    await provider.connection.confirmTransaction(txHash, "finalized");
    console.log(`  https://explorer.solana.com/tx/${txHash}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);

    // Verify that the mint account was initialized
    const newInfo = await provider.connection.getAccountInfo(mint);
    assert(newInfo, "  Mint should be initialized.");

      const fanoutV0Account = await program.account.stake.fetch(stake);

      console.log('newStake',fanoutV0Account)
  });


  it.skip("create_nft_collect", async () => {
    // Check if the mint account already exists
      await createNftCollect(provider, collect, METADATA_SEED, TOKEN_METADATA_PROGRAM_ID, mint, stake, collectMetadata, payer, program, collect_metadata);


  });
  it.skip("mint tokens", async () => {
    // Derive the associated token account address for the payer
    const destination = anchor.utils.token.associatedAddress({
      mint: mint,
      owner: payer,
    });

    // Get initial token balance (0 if account not yet created)
    let initialBalance: number;
    try {
      const balance = await provider.connection.getTokenAccountBalance(
        destination
      );
      initialBalance = balance.value.uiAmount;
    } catch {
      // Token account not yet initiated has 0 balance
      initialBalance = 0;
    }

    // Define the accounts and arguments for the `mintTokens` function call
    const context = {
      mint,
      destination,
      payer,
      rent: SYSVAR_RENT_PUBKEY,
      systemProgram: SystemProgram.programId,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
    };

    // Call the `mintTokens` function to mint tokens
    const txHash = await program.methods
      .mintTokens(new BN(mintAmount * 10 ** metadata.decimals))
      .accounts(context)
      .rpc();
    await provider.connection.confirmTransaction(txHash);
    console.log(`  https://explorer.solana.com/tx/${txHash}?cluster=devnet`);

    // check icy balance of payer
    const postBalance = (
      await provider.connection.getTokenAccountBalance(destination)
    ).value.uiAmount;
    assert.equal(
      initialBalance + mintAmount,
      postBalance,
      "Post balance should equal initial plus mint amount"
    );
  });


  it.skip("mint_nft", async () => {
      await initNft(nft, payer, stake, nftMetadata, masterEditionAccount, collectionMasterEdition, collectMetadata, collect, TOKEN_METADATA_PROGRAM_ID, program, nft_metatdata, provider);

  });

 it("mint_extra_nft", async () => {


        const receive = anchor.utils.token.associatedAddress({
            mint: nft,
            owner: payer,
        });
//stake, nft_mint,receipt_account,metadata_account,master_edition_account,collection_master_edition,
// collection_metadata_account,payer,rent,system_program,associated_token_program,token_program,token_metadata_program

        const context = {
            stake,
            nftMint:nft,
            receiptAccount: receive,
            metadataAccount: nftMetadata,
            masterEditionAccount: masterEditionAccount,
            collectionMasterEdition:collectionMasterEdition,
            collectionMetadataAccount: collectMetadata,
            collection: collect,
            payer,
            rent: SYSVAR_RENT_PUBKEY,
            systemProgram: SystemProgram.programId,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        };

        const txHash = await program.methods
            .mintExtraNft(nft_metatdata)
            .accounts(context)
            .rpc();
        await provider.connection.confirmTransaction(txHash, "finalized");
        console.log(`  https://explorer.solana.com/tx/${txHash}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);

        const fanoutV0Account = await program.account.stake.fetch(stake);

        console.log('newStake',fanoutV0Account)

        // const receiveInfo = await provider.connection.getAccountInfo(receive);
        // console.log('receiveInfo',receiveInfo)



        const ataAccountInfo = await provider.connection.getParsedAccountInfo(receive);

        if (ataAccountInfo.value) {
            console.log(`receive Account Info: ${JSON.stringify(ataAccountInfo.value.data)}`);
        } else {
            console.log("No data found at the associated address.");
        }
        const metaplex = new Metaplex(provider.connection);


        const nftByMint =   await metaplex.nfts().findByMint({mintAddress: nft})
        console.log('nftByMint',nftByMint)

        // const nftBymeta =   await metaplex.nfts().findByMetadata({metadata: nftMetadata})
        // console.log('nftByMint',nftBymeta)

        const receiveNft =   await metaplex.nfts().findAllByOwner({owner: receive})
        console.log('nftByMint',receiveNft,"receive",receive,"nft",nft,"nftMetadata",nftMetadata,"stake",stake)

        const metaData = await provider.connection.getAccountInfo(nftMetadata);

        if (metaData) {
            console.log(`ATA Account Info: ${JSON.stringify(metaData.data)}`);
        } else {
            console.log("No data found at the associated address.");
        }

        const largestAccounts = await provider.connection.getTokenLargestAccounts(
            new PublicKey(nft)
        );
        const largestAccountInfo = await provider.connection.getParsedAccountInfo(
            largestAccounts.value[0].address
        );
        console.log("largestAccountInfo",largestAccountInfo.value);

    });
});
