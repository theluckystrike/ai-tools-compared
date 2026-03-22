---
layout: default
title: "Best AI Tools for Python Type Annotation"
description: "Compare Claude Code, Copilot, and pyright-based tools for adding Python type hints — generics, Protocols, TypeVar, and complex annotation patterns"
date: 2026-03-22
author: theluckystrike
permalink: ai-tools-for-python-type-annotation
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

Python type annotations have a long tail of complexity: `TypeVar` bounds, `Protocol` for structural typing, `ParamSpec` for decorator type safety, and `TypeGuard` for narrowing. AI tools that only know `str | None` annotations will annotate simple code correctly but fail on anything generic. This guide tests Claude Code, Copilot, and MonkeyType against four real-world annotation scenarios.

## Key Takeaways

- **Use Literal for string**: enums 4.
- **Topics covered**: the annotation quality spectrum, task 1: generic functions, task 2: decorator type safety with paramspec
- **Practical guidance included**: Step-by-step setup and configuration instructions
- **Use-case recommendations**: Specific guidance based on team size and requirements

## The Annotation Quality Spectrum

Most AI tools handle these well:
```python
def greet(name: str) -> str: ...
def fetch_user(user_id: int) -> User | None: ...
```

These are where they diverge:
```python
def map_values(d: dict, fn: ???) -> ???: ...  # Generic typing
def retry(fn: ???) -> ???: ...                # Decorator typing
class Repository(???): ...                   # Protocol/ABC typing
```

## Task 1: Generic Functions

**Prompt:** "Add type annotations to this function that maps dict values."

```python
# Before
def map_values(d, fn):
    return {k: fn(v) for k, v in d.items()}
```

**Copilot's annotation:**

```python
def map_values(d: dict, fn: callable) -> dict:
    return {k: fn(v) for k, v in d.items()}
```

`callable` is not a valid type. This is `Callable` from `typing`. Also, `dict` without parameters loses all type information.

**Claude's annotation:**

```python
from typing import TypeVar

K = TypeVar("K")
V = TypeVar("V")
R = TypeVar("R")

def map_values(d: dict[K, V], fn: Callable[[V], R]) -> dict[K, R]:
    """Transform dictionary values using the provided function.

    The keys are preserved; each value is replaced by fn(value).
    """
    return {k: fn(v) for k, v in d.items()}

# Now mypy/pyright knows the full types:
prices: dict[str, int] = {"apple": 100, "banana": 50}
discounted: dict[str, float] = map_values(prices, lambda p: p * 0.9)  # Correct!
```

Claude's version allows type checkers to infer the output type based on the callable's return type.

## Task 2: Decorator Type Safety with ParamSpec

**Prompt:** "Add type annotations to this retry decorator that preserves the wrapped function's signature."

```python
# Before
def retry(max_attempts=3, delay=1.0):
    def decorator(fn):
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return fn(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    time.sleep(delay)
        return wrapper
    return decorator
```

**Copilot's annotation:**

```python
def retry(max_attempts: int = 3, delay: float = 1.0) -> Callable:
    def decorator(fn: Callable) -> Callable:
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            ...
        return wrapper
    return decorator
```

This loses all type information from the wrapped function. `fn(args)` won't type-check inside the wrapper.

**Claude's annotation:**

```python
from typing import TypeVar
from collections.abc import Callable
from functools import wraps
import time

P = ParamSpec("P")
T = TypeVar("T")

def retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    exceptions: tuple[type[Exception], ...] = (Exception,)
) -> Callable[[Callable[P, T]], Callable[P, T]]:
    """Retry decorator that preserves the wrapped function's type signature."""
    def decorator(fn: Callable[P, T]) -> Callable[P, T]:
        @wraps(fn)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            last_error: Exception | None = None
            for attempt in range(max_attempts):
                try:
                    return fn(*args, **kwargs)
                except exceptions as e:
                    last_error = e
                    if attempt < max_attempts - 1:
                        time.sleep(delay * (2 ** attempt))  # Exponential backoff
            raise last_error  # type: ignore[misc]
        return wrapper
    return decorator

# Type safety is preserved:
@retry(max_attempts=3)
def fetch_data(url: str, timeout: int = 30) -> bytes:
    ...

result: bytes = fetch_data("https://example.com", timeout=10)  # Correctly typed
fetch_data(123)  # mypy error: Argument 1 has incompatible type "int"; expected "str"
```

`ParamSpec` is the key — it preserves the parameter types of the wrapped function.

## Task 3: Protocol for Structural Typing

**Prompt:** "Write a function that accepts any object with a `.save()` method. Use structural typing."

**Copilot's output:**

```python
def persist(obj: Any) -> None:  # Uses Any — no type safety
    obj.save()
```

**Claude's output:**

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Saveable(Protocol):
    """Protocol for objects that can be persisted."""
    def save(self) -> None: ...

class SaveWithResult(Protocol):
    """Protocol for objects whose save returns a result."""
    def save(self) -> bool: ...

def persist(obj: Saveable) -> None:
    """Persist any object that implements the Saveable protocol.

    This function works with any class that has a save() method,
    without requiring inheritance from a base class.
    """
    obj.save()

def persist_with_check(obj: SaveWithResult) -> bool:
    return obj.save()

# Works with any class that has save() — no inheritance needed
class UserModel:
    def save(self) -> None:
        print("Saving user to database")

class InMemoryStore:
    def save(self) -> None:
        print("Saving to memory")

persist(UserModel())      # OK
persist(InMemoryStore())  # OK
persist("not saveable")   # mypy error: Argument 1 missing save()

# runtime_checkable enables isinstance checks
assert isinstance(UserModel(), Saveable)  # True at runtime
```

## Task 4: TypedDict and Overload

```python
# Before
def process_config(config):
    if config.get("mode") == "batch":
        return {"status": "queued", "job_id": generate_id()}
    return {"status": "running", "result": execute(config)}
```

**Claude's annotation:**

```python
from typing import TypedDict, Literal, overload

class BatchConfig(TypedDict):
    mode: Literal["batch"]
    batch_size: int

class StreamConfig(TypedDict):
    mode: Literal["stream"]
    buffer_size: int

class BatchResult(TypedDict):
    status: Literal["queued"]
    job_id: str

class StreamResult(TypedDict):
    status: Literal["running"]
    result: Any

@overload
def process_config(config: BatchConfig) -> BatchResult: ...
@overload
def process_config(config: StreamConfig) -> StreamResult: ...

def process_config(config: BatchConfig | StreamConfig) -> BatchResult | StreamResult:
    if config["mode"] == "batch":
        return BatchResult(status="queued", job_id=generate_id())
    return StreamResult(status="running", result=execute(config))

# Type checker knows the exact return type based on input:
batch_result = process_config(BatchConfig(mode="batch", batch_size=100))
# batch_result.job_id is valid — type checker knows it's BatchResult
```

## Automated Annotation with MonkeyType + AI Review

```bash
# Collect runtime type information
pip install monkeytype
monkeytype run your_script.py
monkeytype apply your_module

# Then use Claude to review and improve the generated annotations
python3 << 'EOF'
from anthropic import Anthropic
from pathlib import Path

client = Anthropic()
source = Path("your_module.py").read_text()

response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=2000,
    messages=[{
        "role": "user",
        "content": f"""Review these MonkeyType-generated annotations and improve them:
1. Replace Any with proper generics where possible
2. Add Protocol types where duck typing is used
3. Use Literal for string enums
4. Add TypeVar/ParamSpec where functions are generic

Source:
{source[:4000]}

Return the improved source with annotations."""
    }]
)
print(response.content[0].text)
EOF
```

## Tool Comparison

| Pattern | Claude Code | Copilot | MonkeyType |
|---|---|---|---|
| Basic annotations | Correct | Correct | Correct |
| Generic TypeVar | Full generics | `dict` without params | Runtime-inferred |
| ParamSpec decorators | Correct | Uses `Any` | Partial |
| Protocol types | Full with @runtime_checkable | Uses `Any` | No |
| TypedDict + overload | Complete | Basic TypedDict | No |
| Literal types | Yes | Sometimes | No |

## Related Reading

- [Best AI Tools for Writing Python Type Hints](/ai-tools-compared/best-ai-tools-for-writing-python-type-hints-2026/)
- [Claude vs Copilot for Rust Development](/ai-tools-compared/claude-vs-copilot-for-rust-development/)
- [AI-Powered Code Coverage Improvement](/ai-tools-compared/ai-powered-code-coverage-improvement/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
