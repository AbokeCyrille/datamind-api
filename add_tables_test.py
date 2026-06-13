import sqlite3

conn = sqlite3.connect("test.db")
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY,
    nom TEXT NOT NULL,
    ville TEXT,
    segment TEXT,
    date_creation TEXT
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS achats (
    id INTEGER PRIMARY KEY,
    client_id INTEGER,
    produit TEXT,
    quantite INTEGER,
    prix_unitaire FLOAT,
    date_achat TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id)
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS produits (
    id INTEGER PRIMARY KEY,
    nom TEXT,
    categorie TEXT,
    prix FLOAT,
    stock INTEGER
)
""")

# Données
clients = [
    (1, "Orange CI",    "Abidjan", "Telecom", "2020-01-15"),
    (2, "MTN CI",       "Abidjan", "Telecom", "2019-03-20"),
    (3, "SGBCI",        "Abidjan", "Banque",  "2018-07-10"),
    (4, "Ecobank",      "Abidjan", "Banque",  "2021-02-28"),
    (5, "CFAO Motors",  "Bouaké",  "Auto",    "2022-05-14"),
]
achats = [
    (1, 1, "Laptop Pro",   3,  850000, "2024-01-10"),
    (2, 1, "Serveur Dell", 1, 2500000, "2024-01-15"),
    (3, 2, "Laptop Pro",   5,  850000, "2024-01-20"),
    (4, 3, "Switch Cisco", 2,  450000, "2024-02-05"),
    (5, 4, "Laptop Pro",   2,  850000, "2024-02-10"),
    (6, 5, "Imprimante",   4,  180000, "2024-02-15"),
]
produits = [
    (1, "Laptop Pro",   "Informatique", 850000, 50),
    (2, "Serveur Dell", "Informatique", 2500000, 10),
    (3, "Switch Cisco", "Réseau",       450000, 25),
    (4, "Imprimante",   "Bureautique",  180000, 30),
]

cursor.executemany("INSERT OR IGNORE INTO clients VALUES (?,?,?,?,?)", clients)
cursor.executemany("INSERT OR IGNORE INTO achats VALUES (?,?,?,?,?,?)", achats)
cursor.executemany("INSERT OR IGNORE INTO produits VALUES (?,?,?,?,?)", produits)

conn.commit()
conn.close()
print("✅ Tables clients, achats, produits ajoutées")