pub mod error;

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::DataV2, CreateMetadataAccountsV3,
    },
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};

declare_id!("41zjGbHpvfR155fSkxEhrYx1k9oDqMMiXqfy9BNuRyaB");
const ADMIN_PUBKEY: Pubkey = pubkey!("6HCRpRm4XaDcDzs1yA3ZtUTL3HVFNcydMPzfxkiiyrJj");
// pub const ADMIN_KEY: &'static str ="6HCRpRm4XaDcDzs1yA3ZtUTL3HVFNcydMPzfxkiiyrJj";

pub const URL: &'static str = "https://weinland.io/";

#[program]
pub mod anchor_token {
    use anchor_spl::metadata::{create_master_edition_v3, CreateMasterEditionV3};
    use anchor_spl::metadata::mpl_token_metadata::types::Collection;
    use anchor_spl::token;
    use crate::error::StakeErrorCode;
    use super::*;
    pub fn init_token(ctx: Context<InitToken>, metadata: InitTokenParams) -> Result<()> {
       // let admin=  ADMIN_KEY.parse::<Pubkey>().expect("Failed to parse Admin Key");
       //  require!(admin == *ctx.accounts.payer.key, StakeErrorCode::MustBeAdmin);
        // Define seeds and signer for creating a token account
        let seeds = &["mint".as_bytes(), &[ctx.bumps.mint]];
        let signer = [&seeds[..]];

        // Define the token data with provided metadata
        let token_data: DataV2 = DataV2 {
            name: metadata.name,
            symbol: metadata.symbol,
            uri: metadata.uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        // Create context for the Metadata Accounts creation with the signer
        let metadata_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                payer: ctx.accounts.payer.to_account_info(),
                update_authority: ctx.accounts.mint.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                metadata: ctx.accounts.metadata.to_account_info(),
                mint_authority: ctx.accounts.mint.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            &signer,
        );

        // Call to create metadata accounts with the given token data
        create_metadata_accounts_v3(metadata_ctx, token_data, false, true, None)?;
        ctx.accounts.stake.token_account = ctx.accounts.mint.key();
        msg!("Token mint created successfully.");
        Ok(())
    }


    pub fn init_nft_collect(ctx: Context<InitCollect>, metadata: InitCollectParams) -> Result<()> {
        // Define seeds and signer for creating a token account
        // let admin=  ADMIN_KEY.parse::<Pubkey>().expect("Failed to parse Admin Key");
        // require!(admin == *ctx.accounts.payer.key, StakeErrorCode::MustBeAdmin);
        let seeds = &["collect".as_bytes(), &[ctx.bumps.mint]];
        let signer = [&seeds[..]];

        // Define the token data with provided metadata
        let token_data: DataV2 = DataV2 {
            name: metadata.name,
            symbol: metadata.symbol,
            uri: metadata.uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        // Create context for the Metadata Accounts creation with the signer
        let metadata_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                payer: ctx.accounts.payer.to_account_info(),
                update_authority: ctx.accounts.mint.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                metadata: ctx.accounts.metadata.to_account_info(),
                mint_authority: ctx.accounts.mint.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            &signer,
        );

        // Call to create metadata accounts with the given token data
        create_metadata_accounts_v3(metadata_ctx, token_data, false, true, None)?;

        msg!("Token mint created successfully.");
        ctx.accounts.stake.set_inner(Stake {
            authority: *ctx.accounts.payer.key,
            token_account: Default::default(),
            nft_mint: ctx.accounts.mint.key(),
            nft_collection: ctx.accounts.mint.key(),
            bump_seed: ctx.bumps.stake,
            id: 0,
        });

        Ok(())
    }

    pub fn mint_tokens(ctx: Context<MintTokens>, quantity: u64) -> Result<()> {
        // Define seeds and signer for minting tokens
        let seeds = &["mint".as_bytes(), &[ctx.bumps.mint]];
        let signer = [&seeds[..]];

        // Mint tokens to the destination account with the given quantity
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    authority: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.destination.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                },
                &signer,
            ),
            quantity,
        )?;

        Ok(())
    }




    pub fn mint_extra_nft(ctx: Context<MintSingleNFT>, nft_data: NftData) -> Result<()> {
        // Define seeds and signer for minting tokens

        let seeds=&["nft".as_bytes(), &[ctx.bumps.nft_mint]];
        let signer_seeds = [&seeds[..]];
        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                ctx
                    .accounts
                    .token_metadata_program
                    .to_account_info()
                    .clone(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.metadata_account.to_account_info().clone(),
                    mint: ctx.accounts.nft_mint.to_account_info().clone(),
                    mint_authority: ctx.accounts.nft_mint.to_account_info().clone(),
                    payer: ctx.accounts.payer.to_account_info().clone(),
                    update_authority: ctx.accounts.nft_mint.to_account_info().clone(),
                    system_program: ctx.accounts.system_program.to_account_info().clone(),
                    rent:  ctx.accounts.rent.to_account_info().clone(),
                },
                &signer_seeds,
            ),
            DataV2 {
                name: format!("Weinland Stake Nft  {}", ctx.accounts.stake.id),
                symbol: String::from("WSN"),
                uri: format!("{}/{}.json", nft_data.uri, ctx.accounts.stake.id),
                seller_fee_basis_points: 0,
                creators: None,
                collection: Some(Collection {
                    key: ctx.accounts.collection.key(),
                    verified: false, // Verified in cpi
                }),
                uses: None,
            },
            true,
            true,
            None,
        )?;
        ctx.accounts.stake.id += 1;
        create_master_edition_v3(
            CpiContext::new_with_signer(
                ctx
                    .accounts
                    .token_metadata_program
                    .to_account_info()
                    .clone(),
                CreateMasterEditionV3 {
                    edition: ctx.accounts.master_edition_account.to_account_info().clone(),
                    mint: ctx.accounts.nft_mint.to_account_info().clone(),
                    update_authority: ctx.accounts.nft_mint.to_account_info().clone(),
                    mint_authority: ctx.accounts.nft_mint.to_account_info().clone(),
                    metadata: ctx.accounts.metadata_account.to_account_info().clone(),
                    payer: ctx.accounts.payer.to_account_info().clone(),
                    token_program: ctx.accounts.token_program.to_account_info().clone(),
                    system_program: ctx.accounts.system_program.to_account_info().clone(),
                    rent:  ctx.accounts.rent.to_account_info().clone(),
                },
                &signer_seeds,
            ),
            Some(1),
        )?;
        Ok(())

    }

    pub fn mint_nft(ctx: Context<MintNFT>, nft_data: NftData) -> Result<()> {
        // Define seeds and signer for minting tokens

        let mint_seeds = &["nft".as_bytes(),&[ctx.bumps.nft_mint]];
        let mint_nft_signer = [&mint_seeds[..]];

        token::mint_to(ctx.accounts.mint_ctx().with_signer(&mint_nft_signer), 1)?;
        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                ctx
                    .accounts
                    .token_metadata_program
                    .to_account_info()
                    .clone(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.metadata_account.to_account_info().clone(),
                    mint: ctx.accounts.nft_mint.to_account_info().clone(),
                    mint_authority: ctx.accounts.nft_mint.to_account_info().clone(),
                    payer: ctx.accounts.payer.to_account_info().clone(),
                    update_authority: ctx.accounts.nft_mint.to_account_info().clone(),
                    system_program: ctx.accounts.system_program.to_account_info().clone(),
                    rent:  ctx.accounts.rent.to_account_info().clone(),
                },
                &mint_nft_signer,
            ),
            DataV2 {
                name: format!("Weinland Stake Nft  {}", ctx.accounts.stake.id),
                symbol: String::from("WSN"),
                uri: format!("{}/{}.json", nft_data.uri, ctx.accounts.stake.id),
                seller_fee_basis_points: 0,
                creators: None,
                collection: Some(Collection {
                    key: ctx.accounts.collection.key(),
                    verified: false, // Verified in cpi
                }),
                uses: None,
            },
            true,
            true,
            None,
        )?;
        ctx.accounts.stake.id += 1;
        create_master_edition_v3(
            CpiContext::new_with_signer(
                ctx
                    .accounts
                    .token_metadata_program
                    .to_account_info()
                    .clone(),
                CreateMasterEditionV3 {
                    edition: ctx.accounts.master_edition_account.to_account_info().clone(),
                    mint: ctx.accounts.nft_mint.to_account_info().clone(),
                    update_authority: ctx.accounts.nft_mint.to_account_info().clone(),
                    mint_authority: ctx.accounts.nft_mint.to_account_info().clone(),
                    metadata: ctx.accounts.metadata_account.to_account_info().clone(),
                    payer: ctx.accounts.payer.to_account_info().clone(),
                    token_program: ctx.accounts.token_program.to_account_info().clone(),
                    system_program: ctx.accounts.system_program.to_account_info().clone(),
                    rent:  ctx.accounts.rent.to_account_info().clone(),
                },
                &mint_nft_signer,
            ),
            Some(1),
        )?;

        Ok(())
    }
}


#[derive(Accounts)]
#[instruction(
    params: NftData
)]
pub struct MintNFT<'info> {

    #[account(
        mut,
    )]
    pub stake: Account<'info, Stake>,

    #[account(
        init,
        payer = payer,
        seeds = ["nft".as_bytes()],
        bump,
        mint::decimals = 0,
        mint::authority = nft_mint,
        mint::freeze_authority = nft_mint,
    )]
    pub nft_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = nft_mint,
        associated_token::authority = payer,
    )]
    pub receipt_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = ["metadata".as_bytes(), token_metadata_program.key().as_ref(), nft_mint.key().as_ref()],
        seeds::program = token_metadata_program.key(),
        bump,
    )]
    /// CHECK: Checked by cpi
    pub metadata_account: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = ["metadata".as_ref(), token_metadata_program.key().as_ref(),nft_mint.key().as_ref(), "edition".as_bytes()],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    /// CHECK: Checked by cpi
    pub master_edition_account: UncheckedAccount<'info>,


    #[account(
        seeds = ["metadata".as_bytes(), token_metadata_program.key().as_ref(), collection.key().as_ref(), "edition".as_bytes()],
        seeds::program = token_metadata_program.key(),
        bump,
    )]
    /// CHECK: Checked by cpi
    pub collection_master_edition: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = ["metadata".as_bytes(), token_metadata_program.key().as_ref(), collection.key().as_ref()],
        seeds::program = token_metadata_program.key(),
        bump,
    )]
    /// CHECK: Checked by cpi
    pub collection_metadata_account: UncheckedAccount<'info>,

    pub collection: Box<Account<'info, Mint>>,
    #[account(
        mut,
        address=ADMIN_PUBKEY,
    )]
    pub payer: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    /// CHECK: Checked by cpi
    pub token_metadata_program: UncheckedAccount<'info>,
}
impl <'info> crate::MintNFT<'info> {
    fn mint_ctx(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        let cpi_accounts = MintTo {
            mint: self.nft_mint.to_account_info(),
            to: self.receipt_account.to_account_info(),
            authority: self.nft_mint.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}
//stake, nft_mint,receipt_account,metadata_account,master_edition_account,collection_master_edition,
// collection_metadata_account,payer,rent,system_program,associated_token_program,token_program,token_metadata_program
#[derive(Accounts)]
#[instruction(
    params: NftData
)]
pub struct MintSingleNFT<'info> {

    #[account(
        mut,
        seeds = ["stake".as_bytes()],
        bump
    )]
    pub stake: Account<'info, Stake>,

    #[account(
        seeds = ["nft".as_bytes()],
        bump
    )]
    /// CHECK: Checked by cpi
    pub nft_mint: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = nft_mint,
        associated_token::authority = payer,
    )]
    pub receipt_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = ["metadata".as_bytes(), token_metadata_program.key().as_ref(), nft_mint.key().as_ref()],
        seeds::program = token_metadata_program.key(),
        bump,
    )]
    /// CHECK: Checked by cpi
    pub metadata_account: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = ["metadata".as_ref(), token_metadata_program.key().as_ref(),nft_mint.key().as_ref(), "edition".as_bytes()],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    /// CHECK: Checked by cpi
    pub master_edition_account: UncheckedAccount<'info>,


    #[account(
        seeds = ["metadata".as_bytes(), token_metadata_program.key().as_ref(), collection.key().as_ref(), "edition".as_bytes()],
        seeds::program = token_metadata_program.key(),
        bump,
    )]
    /// CHECK: Checked by cpi
    pub collection_master_edition: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = ["metadata".as_bytes(), token_metadata_program.key().as_ref(), collection.key().as_ref()],
        seeds::program = token_metadata_program.key(),
        bump,
    )]
    /// CHECK: Checked by cpi
    pub collection_metadata_account: UncheckedAccount<'info>,

    pub collection: Box<Account<'info, Mint>>,
    #[account(
        mut,
    address=ADMIN_PUBKEY,
    )]
    pub payer: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    /// CHECK: Checked by cpi
    pub token_metadata_program: UncheckedAccount<'info>,
}


// Struct defining the context for initializing a token
#[derive(Accounts)]
#[instruction(
    params: InitTokenParams
)]
pub struct InitToken<'info> {
    #[account(
     mut
    )]
    pub stake: Box<Account<'info,Stake>>,
    /// CHECK: New Metaplex Account being created
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    #[account(
        init,
        seeds = [b"mint"],
        bump,
        payer = payer,
        mint::decimals = params.decimals,
        mint::authority = mint,
    )]
    pub mint: Account<'info, Mint>,
    #[account(mut,
    address=ADMIN_PUBKEY,
    )]
    pub payer: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    /// CHECK: Metaplex program ID
    pub token_metadata_program: UncheckedAccount<'info>,
}



#[account]
#[derive(Default)]
pub struct Stake {
    pub authority: Pubkey, //stake authority account
    pub token_account: Pubkey, //奖励token mint account
    pub nft_mint: Pubkey,  //nft mint account
    // Collection of NFTs minted representing a receipt voucher
    pub nft_collection: Pubkey,  //nft collect mint account
    pub bump_seed: u8,  //bump seed
    pub id: u32,
}

#[derive(Accounts)]
#[instruction(
    params: InitCollectParams
)]
pub struct InitCollect<'info> {

    #[account(
        init,
        payer = payer,
        seeds = ["stake".as_bytes()],
        space = 8 + std::mem::size_of::<Stake>()  ,
        bump,
    )]
    pub stake: Box<Account<'info,Stake>>,
    /// CHECK: New Metaplex Account being created
    #[account(
        mut
    )]
    pub metadata: UncheckedAccount<'info>,


    #[account(
        init,
        seeds = [b"collect"],
        bump,
        payer = payer,
        mint::decimals = 0,
        mint::authority = mint,
    )]
    pub mint: Box<Account<'info, Mint>>,

    // #[account(
    //     mut,
    //     seeds = ["metadata".as_bytes(), token_metadata_program.key().as_ref(), mint.key().as_ref()],
    //     seeds::program = token_metadata_program.key(),
    //     bump,
    // )]
    // /// CHECK: Checked by cpi
    // pub metadata: UncheckedAccount<'info>,
    //
    // #[account(
    //     seeds = [b"weiland"],
    //     bump,
    //     mint::decimals = 0,
    //     mint::authority = stake,
    // )]
    // pub mint: Account<'info, Mint>,
    #[account(
        mut,
    address=ADMIN_PUBKEY,
    )]
    pub payer: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    /// CHECK: Metaplex program ID
    pub token_metadata_program: UncheckedAccount<'info>,
}

// Struct defining the parameters for initializing a token
#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct InitTokenParams {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
}


#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct NftData{
    pub name: String,
    pub symbol: String,
    pub uri: String
}
#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct InitCollectParams {
    pub name: String,
    pub symbol: String,
    pub uri: String
}

// Struct defining the context for minting tokens
#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(
        mut,
        seeds = [b"mint"],
        bump,
        mint::authority = mint,
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init_if_needed, //Initializes the destination account if it does not exist
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = payer,
    )]
    pub destination: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}
