use diesel::pg::PgConnection;
use diesel::r2d2::{ConnectionManager, Pool, PooledConnection};
use std::env;

pub type DbPool = Pool<ConnectionManager<PgConnection>>;
pub type DbConnection = PooledConnection<ConnectionManager<PgConnection>>;

pub fn get_db_connection() -> Result<DbPool, Box<dyn std::error::Error>> {
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    
    let manager = ConnectionManager::<PgConnection>::new(database_url);
    let pool = Pool::builder()
        .build(manager)?;
    
    Ok(pool)
}

