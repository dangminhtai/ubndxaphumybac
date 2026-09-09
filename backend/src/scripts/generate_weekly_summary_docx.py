import os
import sys

# Ensure current script directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from docx_summary_generator import main


if __name__ == "__main__":
    raise SystemExit(main())
