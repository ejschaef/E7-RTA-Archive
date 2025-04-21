import sqlite3

conn = sqlite3.connect("your_database.db")
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

print(tables)

for table in tables:
    print(table[0])

conn.close()