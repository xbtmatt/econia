/// Mock asset types for on- and off-chain testing.
module econia::assets {

    // Uses >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    use aptos_framework::coin;
    use std::signer::address_of;
    use std::string::utf8;

    // Uses <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

    // Test-only uses >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    #[test_only]
    use aptos_framework::account;

    // Test-only uses <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

    // Structs >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    /// Stores mock coin type capabilities.
    struct CoinCapabilities<phantom CoinType> has key {
        burn_capability: coin::BurnCapability<CoinType>,
        freeze_capability: coin::FreezeCapability<CoinType>,
        mint_capability: coin::MintCapability<CoinType>
    }

    /// Base coin type.
    struct BC{}

    /// Quote coin type.
    struct QC{}

    /// Utility coin type.
    struct UC{}

    // Structs <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

    // Error codes >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    /// When caller is not Econia.
    const E_NOT_ECONIA: u64 = 0;
    /// When coin capabilities have already been initialized.
    const E_HAS_CAPABILITIES: u64 = 1;

    // Error codes <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

    // Constants >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    /// Base coin name.
    const BASE_COIN_NAME: vector<u8> = b"Base coin";
    /// Base coin symbol.
    const BASE_COIN_SYMBOL: vector<u8> = b"BC";
    /// Base coin decimals.
    const BASE_COIN_DECIMALS: u8 = 4;
    /// Quote coin name.
    const QUOTE_COIN_NAME: vector<u8> = b"Quote coin";
    /// Quote coin symbol.
    const QUOTE_COIN_SYMBOL: vector<u8> = b"QC";
    /// Quote coin decimals.
    const QUOTE_COIN_DECIMALS: u8 = 12;
    /// Utility coin name.
    const UTILITY_COIN_NAME: vector<u8> = b"Utility coin";
    /// Utility coin symbol.
    const UTILITY_COIN_SYMBOL: vector<u8> = b"UC";
    /// Utility coin decimals.
    const UTILITY_COIN_DECIMALS: u8 = 10;

    // Constants <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

    // Public functions >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    // Public functions <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

    /// Burn `coins`.
    ///
    /// # Assumptions
    /// * Since `coins` exist in the first place, `CoinCapabilities`
    ///   must exist in the Econia account.
    public fun burn<CoinType>(
        coins: coin::Coin<CoinType>
    ) acquires CoinCapabilities {
        // Borrow immutable reference to burn capability
        let burn_capability = &borrow_global<CoinCapabilities<CoinType>>(
                @econia).burn_capability;
        coin::burn<CoinType>(coins, burn_capability); // Burn coins
    }

    // Public entry functions >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    #[cmd]
    /// Initialize mock base, quote, and utility coin types.
    public entry fun init_coin_types(
        account: &signer
    ) {
        init_coin_type<BC>(account, BASE_COIN_NAME, BASE_COIN_SYMBOL,
            BASE_COIN_DECIMALS); // Initialize mock base coin.
        init_coin_type<QC>(account, QUOTE_COIN_NAME, QUOTE_COIN_SYMBOL,
            QUOTE_COIN_DECIMALS); // Initialize mock quote coin.
        init_coin_type<UC>(account, UTILITY_COIN_NAME, UTILITY_COIN_SYMBOL,
            UTILITY_COIN_DECIMALS); // Initialize mock utility coin.
    }

    #[cmd]
    /// Mint new `amount` of `CoinType`, aborting if not called by
    /// Econia account or if `CoinCapabilities` uninitialized.
    public entry fun mint<CoinType>(
        account: &signer,
        amount: u64
    ): coin::Coin<CoinType>
    acquires CoinCapabilities {
        // Get account address.
        let account_address = address_of(account);
        // Assert caller is Econia.
        assert!(account_address == @econia, E_NOT_ECONIA);
        // Initialize coin types if they have not been initialized yet.
        if (!exists<CoinCapabilities<CoinType>>(@econia))
            init_coin_types(account);
        // Borrow immutable reference to mint capability.
        let mint_capability = &borrow_global<CoinCapabilities<CoinType>>(
                account_address).mint_capability;
        // Mint specified amount.
        coin::mint<CoinType>(amount, mint_capability)
    }

    // Public entry functions <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

    // Private functions >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    /// Initialize given coin type under Econia account.
    fun init_coin_type<CoinType>(
        account: &signer,
        coin_name: vector<u8>,
        coin_symbol: vector<u8>,
        decimals: u8,
    ) {
        // Assert caller is Econia.
        assert!(address_of(account) == @econia, E_NOT_ECONIA);
        // Assert Econia does not already have coin capabilities stored.
        assert!(!exists<CoinCapabilities<CoinType>>(@econia),
            E_HAS_CAPABILITIES);
        // Initialize coin, storing capabilities.
        let (burn_capability, freeze_capability, mint_capability) =
        coin::initialize<CoinType>(
            account, utf8(coin_name), utf8(coin_symbol), decimals, false);
        move_to<CoinCapabilities<CoinType>>(account,
            CoinCapabilities<CoinType>{
                burn_capability,
                freeze_capability,
                mint_capability
        }); // Store capabilities under Econia account.
    }

    // Private functions <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

    // Test-only structs >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    #[test_only]
    /// Generic base asset type
    struct BG{}

    #[test_only]
    /// Generic quote asset type
    struct QG{}

    // Test-only structs <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

    // Test-only functions >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    #[test_only]
    /// Wrapper for `init_coin_types()`, not requiring signature.
    public fun init_coin_types_test() {
        init_coin_types(&account::create_signer_with_capability(
            &account::create_test_signer_cap(@econia)));
    }

    #[test_only]
    /// Wrapper for `mint()`, not requiring signature.
    public fun mint_test<CoinType>(
        amount: u64
    ): coin::Coin<CoinType>
    acquires CoinCapabilities {
        mint(&account::create_signer_with_capability(
            &account::create_test_signer_cap(@econia)), amount)
    }

    // Test-only functions <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

    // Tests >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    #[test(econia = @econia)]
    #[expected_failure(abort_code = 1)]
    /// Verify failure for capabilities already registered.
    fun test_init_has_caps(
        econia: &signer
    ) {
        init_coin_types(econia); // Initialize coin types.
        init_coin_types(econia); // Attempt invalid re-init.
    }

    #[test(account = @user)]
    #[expected_failure(abort_code = 0)]
    /// Verify failure for unauthorized caller.
    fun test_init_not_econia(
        account: &signer
    ) {
        init_coin_types(account); // Attempt invalid init.
    }

    #[test(account = @econia)]
    /// Verify successful mint, then burn.
    fun test_mint_and_burn(
        account: &signer
    ) acquires CoinCapabilities {
        let base_coin = mint<BC>(account, 20); // Mint base coin.
        // Assert correct value minted.
        assert!(coin::value(&base_coin) == 20, 0);
        burn<BC>(base_coin); // Burn coins.
        // Assert can burn another coin that has now been initialized.
        burn<QC>(mint(account, 1));
    }

    #[test(account = @user)]
    #[expected_failure(abort_code = 0)]
    /// Verify failure for unauthorized caller.
    fun test_mint_not_econia(
        account: &signer
    ): coin::Coin<BC>
    acquires CoinCapabilities {
        mint<BC>(account, 20) // Attempt invalid mint.
    }

    // Tests <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

}