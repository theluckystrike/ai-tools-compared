---
layout: article
title: "Cursor vs Copilot for Adding Type Hints to Untyped Python"
description: "A practical comparison of Cursor and GitHub Copilot for automatically adding type hints to legacy Python codebases. Which AI coding assistant handles."
date: 2026-03-16
author: theluckystrike
permalink: /cursor-vs-copilot-for-adding-type-hints-to-untyped-python-co/
categories: [guides]
tags: [tools]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
---


{% raw %}

This guide compares the strengths and weaknesses of each tool for this specific task. Choose the tool that best matches your workflow, budget, and technical requirements.



## Understanding the Type Hint Challenge



Legacy Python code often lacks type annotations, making it harder to maintain, refactor, and debug. Manually adding type hints to a large codebase can take weeks or months. AI coding assistants promise to automate this process, but the quality of their type inferences varies significantly.



## Cursor's Approach to Type Hints



Cursor uses Claude (and optionally GPT) for code generation and modification. When you ask Cursor to add type hints, it analyzes the function's behavior, variable usage, and return values to infer appropriate types.



### Example: Adding Type Hints with Cursor



```python
# Before type hints (untyped)
def process_user_data(user_data):
    results = []
    for item in user_data:
        if item.get("active"):
            results.append({
                "id": item["id"],
                "name": item["name"],
                "email": item["email"]
            })
    return results
```


When you ask Cursor to add type hints, it typically produces:



```python
from typing import TypedDict, List

class UserData(TypedDict):
    id: int
    name: str
    email: str
    active: bool

class ProcessedUser(TypedDict):
    id: int
    name: str
    email: str

def process_user_data(user_data: List[UserData]) -> List[ProcessedUser]:
    results: List[ProcessedUser] = []
    for item in user_data:
        if item.get("active"):
            results.append({
                "id": item["id"],
                "name": item["name"],
                "email": item["email"]
            })
    return results
```


Cursor often suggests using `TypedDict` for dictionary structures and correctly infers `List` types. However, it sometimes over-uses `Any` when the context is unclear.



## GitHub Copilot's Approach



GitHub Copilot uses OpenAI's models and integrates directly into VS Code. Its type hint generation is more conservative, often defaulting to basic types without creating custom type definitions.



### Example: Adding Type Hints with Copilot



```python
# Before type hints
def calculate_metrics(sales_data, discount_rate):
    total = 0
    for sale in sales_data:
        total += sale['amount'] * (1 - discount_rate)
    return {
        'net_total': total,
        'discount_amount': sum(s['amount'] for s in sales_data) * discount_rate
    }
```


Copilot might suggest:



```python
from typing import List, Dict, Any

def calculate_metrics(sales_data: List[Dict[str, Any]], discount_rate: float) -> Dict[str, float]:
    total = 0.0
    for sale in sales_data:
        total += sale['amount'] * (1 - discount_rate)
    return {
        'net_total': total,
        'discount_amount': sum(s['amount'] for s in sales_data) * discount_rate
    }
```


Copilot tends to use `Dict[str, Any]` more frequently, which provides less type safety than custom TypedDicts.



## Side-by-Side Comparison



| Aspect | Cursor | GitHub Copilot |

|--------|--------|----------------|

| Type specificity | Higher (TypedDict, custom types) | Lower (Any, generic Dict) |

| Context awareness | Analyzes broader file context | Focuses on local function |

| Union types | Infers Optional, Union correctly | Sometimes misses Optional |

| Custom types | Creates TypedDict automatically | Rarely suggests custom types |

| Performance on large files | Processes faster with Claude | Slower for complex inference |



## Practical Workflow Examples



### Using Cursor's Composer for Type Hints



```python
# Python function needing type hints
def transform_records(records, filter_key, transform_fn):
    return [transform_fn(r) for r in records if r.get(filter_key)]
```


In Cursor, you would use the Composer to ask:

```
Add proper type hints to this function. Use List[T] syntax and infer types from usage.
```


Cursor typically produces:



```python
from typing import TypeVar, Callable, List, Dict, Any, Optional

T = TypeVar('T')
R = TypeVar('R')

def transform_records(
    records: List[Dict[str, Any]], 
    filter_key: str, 
    transform_fn: Callable[[Dict[str, Any]], R]
) -> List[R]:
    return [transform_fn(r) for r in records if r.get(filter_key)]
```


### Using Copilot's Inline Suggestions



Copilot works differently—it provides inline suggestions as you type. For type hints, you often need to trigger suggestions explicitly:



```python
# Type the function signature with basic types
def transform_records(records, filter_key, transform_fn) -> list:
    # Copilot might suggest completing with types
    pass
```


Copilot's suggestions are less than Cursor's explicit type hint generation.



## Handling Complex Type Inference



### Complex Function Example



```python
# Untyped function with complex logic
def aggregate_orders(orders, customer_id=None):
    if customer_id:
        orders = [o for o in orders if o['customer_id'] == customer_id]
    
    by_status = {}
    for order in orders:
        status = order['status']
        if status not in by_status:
            by_status[status] = {'count': 0, 'total': 0}
        by_status[status]['count'] += 1
        by_status[status]['total'] += order['total']
    
    return by_status
```


**Cursor's output:**



```python
from typing import Dict, List, Optional, Literal

Order = Dict[str, Any]  # You could define a TypedDict here for better safety

OrderStatus = Literal['pending', 'processing', 'shipped', 'delivered', 'cancelled']

def aggregate_orders(
    orders: List[Order], 
    customer_id: Optional[int] = None
) -> Dict[OrderStatus, Dict[str, float]]:
    if customer_id:
        orders = [o for o in orders if o['customer_id'] == customer_id]
    
    by_status: Dict[OrderStatus, Dict[str, float]] = {}
    for order in orders:
        status: OrderStatus = order['status']
        if status not in by_status:
            by_status[status] = {'count': 0, 'total': 0.0}
        by_status[status]['count'] += 1
        by_status[status]['total'] += order['total']
    
    return by_status
```


**Copilot's output:**



```python
from typing import Dict, List, Any, Optional

def aggregate_orders(orders: List[Dict[str, Any]], customer_id: Optional[int] = None) -> Dict[str, Dict[str, float]]:
    if customer_id:
        orders = [o for o in orders if o['customer_id'] == customer_id]
    
    by_status: Dict[str, Dict[str, float]] = {}
    for order in orders:
        status = order['status']
        if status not in by_status:
            by_status[status] = {'count': 0, 'total': 0.0}
        by_status[status]['count'] += 1
        by_status[status]['total'] += order['total']
    
    return by_status
```


Cursor produces more specific types (Literal for order status), while Copilot uses generic string keys.



## Database Query Type Hints



When working with database results, both tools handle type hints differently:



```python
# Mock database fetch function
def fetch_users(conn, active_only=True):
    cursor = conn.cursor()
    query = "SELECT id, name, email, created_at FROM users"
    if active_only:
        query += " WHERE active = 1"
    cursor.execute(query)
    return cursor.fetchall()
```


**Cursor's type hint suggestion:**



```python
from typing import List, Tuple, Optional
from datetime import datetime
import MySQL.connections

def fetch_users(conn: MySQL.connections.Connection, active_only: bool = True) -> List[Tuple[int, str, str, datetime]]:
    cursor = conn.cursor()
    query = "SELECT id, name, email, created_at FROM users"
    if active_only:
        query += " WHERE active = 1"
    cursor.execute(query)
    return cursor.fetchall()
```


**Copilot's suggestion:**



```python
from typing import List, Any

def fetch_users(conn: Any, active_only: bool = True) -> List[Any]:
    cursor = conn.cursor()
    query = "SELECT id, name, email, created_at FROM users"
    if active_only:
        query += " WHERE active = 1"
    cursor.execute(query)
    return cursor.fetchall()
```


Cursor correctly identifies the return type as a tuple with specific types, while Copilot defaults to `List[Any]`.



## Verifying Type Hint Quality



After generating type hints, run mypy to verify correctness:



```bash
# Install mypy
pip install mypy

# Run type checking
mypy your_module.py
```


Both tools sometimes generate type hints that fail mypy strict mode checks. Cursor tends to produce more mypy-friendly code, but you should always verify with:



```python
# Example that needs # type: ignore comments
result = json.loads(user_input)  # mypy might complain here
```


## Which Tool Should You Use?



Choose **Cursor** if you:

- Want more specific, custom type definitions

- Need better handling of TypedDict and Literal types

- Prefer having type hints that pass mypy strict checks

- Want Claude's reasoning for complex type inference



Choose **GitHub Copilot** if you:

- Prefer inline, non-intrusive suggestions

- Need basic type hints quickly

- Already heavily invested in VS Code ecosystem

- Want simpler, more conservative type annotations



## Related Reading

- [Best AI Coding Assistants Compared](/ai-tools-compared/best-ai-coding-assistants-compared/)
- [Best AI Coding Assistant Tools Compared 2026](/ai-tools-compared/best-ai-coding-assistant-tools-compared-2026/)
- [AI Tools Guides Hub](/ai-tools-compared/guides-hub/)
- [Copilot vs Cursor for Implementing Redis Caching.](/ai-tools-compared/copilot-vs-cursor-for-implementing-redis-caching-patterns-in/)
- [Copilot vs Cursor for Writing Pytest.](/ai-tools-compared/copilot-vs-cursor-for-writing--pytest-fixtures-/)
- [Copilot vs Cursor for Writing Terraform Modules from Scratch](/ai-tools-compared/copilot-vs-cursor-for-writing-terraform-modules-from-scratch/)

Built by

Built by theluckystrike — More at [zovo.one](https://zovo.one)
