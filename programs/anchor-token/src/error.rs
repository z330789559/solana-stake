use anchor_lang::error_code;

#[error_code]
pub enum StakeErrorCode {
    #[msg("not enough time to reclaim")]
    NotEnoughTime,
    #[msg("invalid metadata information")]
    NoMatchMetadata,
    #[msg("invalid token")]
    NoMatchSymbol,
    #[msg("must be admin")]
    MustBeAdmin,
}
