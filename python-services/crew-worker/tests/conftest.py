import sys
import os

# chromadb (dependência transitiva do crewai) exige sqlite3 >= 3.35.0;
# o sqlite3 do sistema em runners Linux costuma ser mais antigo.
# https://docs.trychroma.com/troubleshooting#sqlite
try:
    __import__("pysqlite3")
    sys.modules["sqlite3"] = sys.modules.pop("pysqlite3")
except ImportError:
    pass

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
