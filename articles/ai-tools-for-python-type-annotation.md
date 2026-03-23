---
layout: default
title: "Best AI Tools for Python Type Annotation"
description: "Compare Claude Code, Copilot, and pyright-based tools for adding Python type hints. generics, Protocols, TypeVar, and complex annotation patterns"
date: 2026-03-22
author: theluckystrike
permalink: ai-tools-for-python-type-annotation
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Python type annotations have a long tail of complexity: `TypeVar` bounds, `Protocol` for structural typing, `ParamSpec` for decorator type safety, and `TypeGuard` for narrowing. AI tools that only know `str | None` annotations will annotate simple code correctly but fail on anything generic. This guide tests Claude Code, Copilot, and MonkeyType against four real-world annotation scenarios.

Table of Contents

- [The Annotation Quality Spectrum](#the-annotation-quality-spectrum)
- [Why Type Annotations Pay Off](#why-type-annotations-pay-off)
- [Setting Up Your Annotation Workflow](#setting-up-your-annotation-workflow)
- [Task 1: Generic Functions](#task-1-generic-functions)
- [Task 2: Decorator Type Safety with ParamSpec](#task-2-decorator-type-safety-with-paramspec)
- [Task 3: Protocol for Structural Typing](#task-3-protocol-for-structural-typing)
- [Task 4: TypedDict and Overload](#task-4-typeddict-and-overload)
- [Task 5: TypeGuard for Narrowing Functions](#task-5-typeguard-for-narrowing-functions)
- [Automated Annotation with MonkeyType + AI Review](#automated-annotation-with-monkeytype-ai-review)
- [Choosing the Right Tool by Team Size](#choosing-the-right-tool-by-team-size)
- [Tool Comparison](#tool-comparison)
- [Related Reading](#related-reading)

The Annotation Quality Spectrum

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

The difference matters in real codebases. `dict` without parameters is technically valid but tells the type checker nothing useful. `Any` is worse. it silently disables checking downstream.

Why Type Annotations Pay Off

Type annotations are documentation that can't go stale. When a function signature says `fn: Callable[[V], R]`, every IDE and type checker understands the relationship between inputs and outputs. When someone changes the callable's return type, the type checker immediately flags every call site that assumes the old return type.

The investment also compounds. A codebase with 60%+ annotation coverage catches refactoring errors before they reach CI. Teams that add annotations incrementally. starting with public APIs and utility functions. see meaningful error detection within weeks. AI tools dramatically accelerate this process because generating annotations is mechanical work that doesn't require understanding business logic.

Setting Up Your Annotation Workflow

Before comparing tools, a quick setup note. For interactive use, `pyright` gives instant feedback:

```bash
pip install pyright mypy monkeytype
VS Code: install the Pylance extension (uses pyright internally)

Check a file for annotation errors
pyright your_module.py

Strict mode: catch everything
pyright --strict your_module.py
```

For CI, add mypy to your pipeline:

```yaml
.github/workflows/typecheck.yml
- name: Run mypy
  run: mypy --strict src/ --ignore-missing-imports
```

Task 1: Generic Functions

Prompt: "Add type annotations to this function that maps dict values."

```python
Before
def map_values(d, fn):
    return {k: fn(v) for k, v in d.items()}
```

Copilot's annotation:

```python
def map_values(d: dict, fn: callable) -> dict:
    return {k: fn(v) for k, v in d.items()}
```

`callable` is not a valid type. This is `Callable` from `typing`. Also, `dict` without parameters loses all type information.

Claude's annotation:

```python
from typing import TypeVar
from collections.abc import Callable

K = TypeVar("K")
V = TypeVar("V")
R = TypeVar("R")

def map_values(d: dict[K, V], fn: Callable[[V], R]) -> dict[K, R]:
    """Transform dictionary values using the provided function.

    The keys are preserved; each value is replaced by fn(value).
    """
    return {k: fn(v) for k, v in d.items()}

Now mypy/pyright knows the full types:
prices: dict[str, int] = {"apple": 100, "banana": 50}
discounted: dict[str, float] = map_values(prices, lambda p: p * 0.9)  # Correct!
```

Claude's version allows type checkers to infer the output type based on the callable's return type. This means `map_values(user_ids, fetch_user)` correctly infers `dict[str, User | None]` without any additional annotation.

Task 2: Decorator Type Safety with ParamSpec

Prompt: "Add type annotations to this retry decorator that preserves the wrapped function's signature."

```python
Before
def retry(max_attempts=3, delay=1.0):
    def decorator(fn):
        def wrapper(*args, kwargs):
            for attempt in range(max_attempts):
                try:
                    return fn(*args, kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    time.sleep(delay)
        return wrapper
    return decorator
```

Copilot's annotation:

```python
def retry(max_attempts: int = 3, delay: float = 1.0) -> Callable:
    def decorator(fn: Callable) -> Callable:
        def wrapper(*args: Any, kwargs: Any) -> Any:
            ...
        return wrapper
    return decorator
```

This loses all type information from the wrapped function. `fn(args)` won't type-check inside the wrapper.

Claude's annotation:

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
        def wrapper(*args: P.args, kwargs: P.kwargs) -> T:
            last_error: Exception | None = None
            for attempt in range(max_attempts):
                try:
                    return fn(*args, kwargs)
                except exceptions as e:
                    last_error = e
                    if attempt < max_attempts - 1:
                        time.sleep(delay * (2  attempt))  # Exponential backoff
            raise last_error  # type: ignore[misc]
        return wrapper
    return decorator

Type safety is preserved:
@retry(max_attempts=3)
def fetch_data(url: str, timeout: int = 30) -> bytes:
    ...

result: bytes = fetch_data("https://example.com", timeout=10)  # Correctly typed
fetch_data(123)  # mypy error: Argument 1 has incompatible type "int"; expected "str"
```

`ParamSpec` is the key. it preserves the parameter types of the wrapped function. This was introduced in Python 3.10 and backported via `typing_extensions` for earlier versions.

Task 3: Protocol for Structural Typing

Prompt: "Write a function that accepts any object with a `.save()` method. Use structural typing."

Copilot's output:

```python
def persist(obj: Any) -> None:  # Uses Any. no type safety
    obj.save()
```

Claude's output:

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

Works with any class that has save(). no inheritance needed
class UserModel:
    def save(self) -> None:
        print("Saving user to database")

class InMemoryStore:
    def save(self) -> None:
        print("Saving to memory")

persist(UserModel())      # OK
persist(InMemoryStore())  # OK
persist("not saveable")   # mypy error: Argument 1 missing save()

runtime_checkable enables isinstance checks
assert isinstance(UserModel(), Saveable)  # True at runtime
```

The practical advantage of `Protocol` over `ABC` is that existing classes satisfy it without modification. If you're consuming third-party objects that happen to have a `save()` method, `Protocol` lets you type-check against them without monkey-patching.

Task 4: TypedDict and Overload

```python
Before
def process_config(config):
    if config.get("mode") == "batch":
        return {"status": "queued", "job_id": generate_id()}
    return {"status": "running", "result": execute(config)}
```

Claude's annotation:

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

Type checker knows the exact return type based on input:
batch_result = process_config(BatchConfig(mode="batch", batch_size=100))
batch_result.job_id is valid. type checker knows it's BatchResult
```

`@overload` lets you express that a function's return type depends on its input type. Without it, the return type would be `BatchResult | StreamResult` and you'd need a type narrowing assertion every time you use the result.

Task 5: TypeGuard for Narrowing Functions

One pattern where tool quality diverges sharply is `TypeGuard`. functions that narrow a union type inside conditionals.

```python
Before. type checker can't narrow inside this branch
def is_valid_user(obj: dict) -> bool:
    return "id" in obj and "email" in obj

After. Claude adds TypeGuard
from typing import TypeGuard

class UserDict(TypedDict):
    id: str
    email: str
    name: str

def is_valid_user(obj: dict) -> TypeGuard[UserDict]:
    """Return True if obj has all required UserDict fields."""
    return (
        isinstance(obj.get("id"), str) and
        isinstance(obj.get("email"), str) and
        isinstance(obj.get("name"), str)
    )

Now type checker narrows inside the branch
def process_api_response(data: dict) -> str | None:
    if is_valid_user(data):
        return data["email"]  # data is UserDict here. no error
    return None
```

Copilot produces `-> bool` without the `TypeGuard` wrapper. This works at runtime but the type checker treats the branch as still having type `dict`, so field access still generates warnings.

Automated Annotation with MonkeyType + AI Review

```bash
Collect runtime type information
pip install monkeytype
monkeytype run your_script.py
monkeytype apply your_module
```

Then use Claude to review and improve the generated annotations:

```python
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
5. Add TypeGuard where isinstance checks narrow types

Source:
{source[:4000]}

Return the improved source with annotations."""
    }]
)
print(response.content[0].text)
```

MonkeyType captures what types actually flowed through at runtime, which eliminates guesswork about what values a function actually receives. The AI review then upgrades flat `str` annotations to `Literal["pending", "shipped"]` where the sample values suggest it, and adds generics where MonkeyType fell back to `Any`.

Choosing the Right Tool by Team Size

For solo projects or small teams (1, 5 engineers): Use Claude Code interactively. Ask it to annotate one module at a time and review the output. Focus on public function signatures first; internal helpers can wait.

For medium teams (5, 20 engineers): Add mypy to CI with `--strict` on new code only (`--exclude` existing modules). Use MonkeyType to collect runtime types for existing modules, then AI-review the generated stubs before committing.

For large codebases: Run pyright in watch mode for developers and mypy in CI. Use a staged rollout. annotate utilities and shared libraries first, then work outward. Copilot handles the mechanical volume; Claude handles the complex patterns like ParamSpec and Protocol.

Tool Comparison

| Pattern | Claude Code | Copilot | MonkeyType |
|---|---|---|---|
| Basic annotations | Correct | Correct | Correct |
| Generic TypeVar | Full generics | `dict` without params | Runtime-inferred |
| ParamSpec decorators | Correct | Uses `Any` | Partial |
| Protocol types | Full with @runtime_checkable | Uses `Any` | No |
| TypedDict + overload | Complete | Basic TypedDict | No |
| Literal types | Yes | Sometimes | No |
| TypeGuard | Yes | Rarely | No |

Related Articles

- [Best AI Tools for Writing Python Type Hints 2026](/best-ai-tools-for-writing-python-type-hints-2026/)
- [Cursor vs Copilot for Adding Type Hints to Untyped Python](/cursor-vs-copilot-for-adding-type-hints-to-untyped-python-co/)
- [Best AI Tools for TypeScript Type Inference and Generic](/best-ai-tools-for-typescript-type-inference-and-generic-type/)
- [Best AI Assistant for Fixing TypeScript Strict Mode Type](/best-ai-assistant-for-fixing-typescript-strict-mode-type-nar/)
- [How Well Do AI Tools Handle Go Generics Type Parameter](/how-well-do-ai-tools-handle-go-generics-type-parameter-const/)
Built by theluckystrike. More at [zovo.one](https://zovo.one)
{% endraw %}
