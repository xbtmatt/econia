use bigdecimal::BigDecimal;
use chrono::{DateTime, Utc};
use diesel::{prelude::*, Connection, PgConnection};
use models::{
    events::{MakerEvent, MakerEventType},
    order::Side,
};
use serde::Deserialize;

use crate::models::{
    coin::{Coin, NewCoin},
    events::NewMakerEvent,
    market::{MarketRegistrationEvent, NewMarketRegistrationEvent},
};

pub mod models;
pub mod schema;

#[derive(Deserialize, Debug)]
pub struct Config {
    pub database_url: String,
}

pub fn load_config() -> Config {
    dotenvy::dotenv().ok();
    match envy::from_env::<Config>() {
        Ok(cfg) => cfg,
        Err(err) => panic!("{:?}", err),
    }
}

pub fn establish_connection(url: String) -> PgConnection {
    PgConnection::establish(&url)
        .unwrap_or_else(|_| panic!("Could not connect to database {}", url))
}

pub fn create_coin(
    conn: &mut PgConnection,
    account_address: &str,
    module_name: &str,
    struct_name: &str,
    symbol: Option<&str>,
    name: Option<&str>,
    decimals: Option<i16>,
) -> Coin {
    use crate::schema::coins;

    let new_coin = NewCoin {
        account_address,
        module_name,
        struct_name,
        symbol,
        name,
        decimals,
    };

    diesel::insert_into(coins::table)
        .values(&new_coin)
        .get_result(conn)
        .expect("Error adding new coin.")
}

pub fn register_market(
    conn: &mut PgConnection,
    market_id: BigDecimal,
    time: DateTime<Utc>,
    base_id: i32,
    base_name_generic: Option<&str>,
    quote_id: i32,
    lot_size: BigDecimal,
    tick_size: BigDecimal,
    min_size: BigDecimal,
    underwriter_id: BigDecimal,
) -> MarketRegistrationEvent {
    use crate::schema::market_registration_events;

    let new_market_registration_event = NewMarketRegistrationEvent {
        market_id,
        time,
        base_id,
        base_name_generic,
        quote_id,
        lot_size,
        tick_size,
        min_size,
        underwriter_id,
    };

    diesel::insert_into(market_registration_events::table)
        .values(&new_market_registration_event)
        .get_result(conn)
        .expect("Error adding market registration event.")
}

pub fn add_maker_event(
    conn: &mut PgConnection,
    market_id: BigDecimal,
    side: Side,
    market_order_id: BigDecimal,
    user_address: &str,
    custodian_id: Option<BigDecimal>,
    event_type: MakerEventType,
    size: BigDecimal,
    price: BigDecimal,
    time: DateTime<Utc>,
) -> MakerEvent {
    use crate::schema::maker_events;

    let new_maker_event = NewMakerEvent {
        market_id,
        side,
        market_order_id,
        user_address,
        custodian_id,
        event_type,
        size,
        price,
        time,
    };

    diesel::insert_into(maker_events::table)
        .values(&new_maker_event)
        .get_result(conn)
        .expect("Error adding maker event.")
}
