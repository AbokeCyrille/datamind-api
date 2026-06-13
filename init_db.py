from sqlalchemy import create_engine, text
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

# Railway PostgreSQL utilise postgres:// mais SQLAlchemy veut postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS ventes (
            id SERIAL PRIMARY KEY,
            montant FLOAT,
            mois VARCHAR(50),
            region VARCHAR(100),
            vendeur VARCHAR(100)
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS clients (
            id SERIAL PRIMARY KEY,
            nom VARCHAR(200),
            ville VARCHAR(100),
            segment VARCHAR(100),
            date_creation VARCHAR(50)
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS achats (
            id SERIAL PRIMARY KEY,
            client_id INTEGER,
            produit VARCHAR(200),
            quantite INTEGER,
            prix_unitaire FLOAT,
            date_achat VARCHAR(50)
        )
    """))
    conn.execute(text("""
        INSERT INTO ventes (montant, mois, region, vendeur) VALUES
        (4200000, 'janvier', 'Nord', 'Koné'),
        (3100000, 'janvier', 'Sud', 'Diabaté'),
        (5800000, 'janvier', 'Est', 'Traoré'),
        (2900000, 'février', 'Nord', 'Koné'),
        (6100000, 'février', 'Sud', 'Coulibaly'),
        (4400000, 'février', 'Est', 'Diabaté'),
        (7200000, 'mars', 'Nord', 'Traoré'),
        (3800000, 'mars', 'Sud', 'Koné'),
        (5100000, 'mars', 'Est', 'Coulibaly')
        ON CONFLICT DO NOTHING
    """))
    conn.execute(text("""
        INSERT INTO clients (nom, ville, segment, date_creation) VALUES
        ('Orange CI', 'Abidjan', 'Telecom', '2020-01-15'),
        ('MTN CI', 'Abidjan', 'Telecom', '2019-03-20'),
        ('SGBCI', 'Abidjan', 'Banque', '2018-07-10'),
        ('Ecobank', 'Abidjan', 'Banque', '2021-02-28'),
        ('CFAO Motors', 'Bouaké', 'Auto', '2022-05-14')
        ON CONFLICT DO NOTHING
    """))
    conn.execute(text("""
        INSERT INTO achats (client_id, produit, quantite, prix_unitaire, date_achat) VALUES
        (1, 'Laptop Pro', 3, 850000, '2024-01-10'),
        (1, 'Serveur Dell', 1, 2500000, '2024-01-15'),
        (2, 'Laptop Pro', 5, 850000, '2024-01-20'),
        (3, 'Switch Cisco', 2, 450000, '2024-02-05'),
        (4, 'Laptop Pro', 2, 850000, '2024-02-10'),
        (5, 'Imprimante', 4, 180000, '2024-02-15')
        ON CONFLICT DO NOTHING
    """))
    conn.commit()
    print("✅ Base de données initialisée")