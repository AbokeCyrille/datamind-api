import sqlite3

conn = sqlite3.connect("test.db")
cursor = conn.cursor()

# Création des tables
cursor.execute("""
CREATE TABLE IF NOT EXISTS ventes (
    id INTEGER PRIMARY KEY,
    montant FLOAT,
    mois TEXT,
    region TEXT,
    vendeur TEXT
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY,
    nom TEXT,
    ville TEXT,
    segment TEXT
)
""")

# Données de test
ventes = [
    (1, 4200000, 'janvier', 'Nord', 'Koné'),
    (2, 3100000, 'janvier', 'Sud', 'Diabaté'),
    (3, 5800000, 'janvier', 'Est', 'Traoré'),
    (4, 2900000, 'février', 'Nord', 'Koné'),
    (5, 6100000, 'février', 'Sud', 'Coulibaly'),
    (6, 4400000, 'février', 'Est', 'Diabaté'),
    (7, 7200000, 'mars', 'Nord', 'Traoré'),
    (8, 3800000, 'mars', 'Sud', 'Koné'),
    (9, 5100000, 'mars', 'Est', 'Coulibaly'),
]

clients = [
    (1, 'Orange CI', 'Abidjan', 'Telecom'),
    (2, 'MTN CI', 'Abidjan', 'Telecom'),
    (3, 'SGBCI', 'Abidjan', 'Banque'),
    (4, 'Ecobank', 'Abidjan', 'Banque'),
    (5, 'CFAO Motors', 'Bouaké', 'Auto'),
]

cursor.executemany("INSERT OR IGNORE INTO ventes VALUES (?,?,?,?,?)", ventes)
cursor.executemany("INSERT OR IGNORE INTO clients VALUES (?,?,?,?)", clients)

conn.commit()
conn.close()
print("✅ Base de test créée : test.db")