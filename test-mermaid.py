import sys
sys.path.insert(0, '/app')
from flowchart_gen import _sanitize_mermaid

# Test with mixed Chinese + Vietnamese
bad = '''flowchart TD
    A[开始] --> B[1. 原则：Storytelling]
    B --> C[结构: 问题 -> 解决方案 -> 实施]
    D{设定问题: 具体情境} --> E[Quy định: Áp dụng]
'''

print("BEFORE:")
print(bad)
print("AFTER:")
print(_sanitize_mermaid(bad))