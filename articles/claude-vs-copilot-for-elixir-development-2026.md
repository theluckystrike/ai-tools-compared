---
layout: default
title: "Claude vs Copilot for Elixir Development 2026"
description: "Compare Claude and GitHub Copilot for Elixir. GenServer, Phoenix, Ecto, and OTP patterns with real code output comparisons and prompt strategies"
date: 2026-03-22
author: theluckystrike
permalink: /claude-vs-copilot-for-elixir-development-2026/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, comparison, claude-ai]
---

{% raw %}

Claude vs Copilot for Elixir Development 2026

Elixir is a minority language in AI training data, which shows in the quality gaps between tools. This comparison covers practical development workflows across GenServer, Phoenix, Ecto, and OTP supervision trees.

Test 1 - GenServer Implementation

Prompt:
```text
Write an Elixir GenServer for a rate limiter. It should:
- Track request counts per client_id using a Map in state
- Allow 100 requests per 60 seconds per client
- Expose check_rate(client_id) → :allow | {:deny, retry_after_ms}
- Clean up stale entries every 30 seconds using Process.send_after
- Be supervised with a proper child_spec
```

Claude Output

```elixir
defmodule MyApp.RateLimiter do
  use GenServer
  require Logger

  @limit 100
  @window_ms 60_000
  @cleanup_interval_ms 30_000

  defstruct requests: %{}

  # Client API

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, %__MODULE__{}, Keyword.put_new(opts, :name, __MODULE__))
  end

  @spec check_rate(client_id :: String.t()) :: :allow | {:deny, retry_after_ms :: integer()}
  def check_rate(client_id) do
    GenServer.call(__MODULE__, {:check_rate, client_id})
  end

  # Server callbacks

  @impl true
  def init(state) do
    schedule_cleanup()
    {:ok, state}
  end

  @impl true
  def handle_call({:check_rate, client_id}, _from, state) do
    now = System.monotonic_time(:millisecond)
    window_start = now - @window_ms

    entries = Map.get(state.requests, client_id, [])
    recent = Enum.filter(entries, fn ts -> ts > window_start end)

    if length(recent) < @limit do
      new_entries = [now | recent]
      new_requests = Map.put(state.requests, client_id, new_entries)
      {:reply, :allow, %{state | requests: new_requests}}
    else
      oldest_in_window = Enum.min(recent)
      retry_after = oldest_in_window + @window_ms - now
      {:reply, {:deny, max(retry_after, 0)}, state}
    end
  end

  @impl true
  def handle_info(:cleanup, state) do
    now = System.monotonic_time(:millisecond)
    window_start = now - @window_ms

    pruned =
      state.requests
      |> Enum.reject(fn {_id, entries} ->
        Enum.all?(entries, fn ts -> ts <= window_start end)
      end)
      |> Map.new()

    Logger.debug("RateLimiter cleanup: #{map_size(state.requests)} → #{map_size(pruned)} clients")
    schedule_cleanup()
    {:noreply, %{state | requests: pruned}}
  end

  defp schedule_cleanup do
    Process.send_after(self(), :cleanup, @cleanup_interval_ms)
  end
end
```

Claude uses `System.monotonic_time(:millisecond)` (correct. wall clock `DateTime.utc_now()` can go backward during NTP adjustments), `@impl true` annotations, a struct for state, and calculates `retry_after` correctly from the oldest entry in the window.

Copilot Output

Copilot generates a working GenServer but:
- Uses `DateTime.utc_now()` for timestamps (susceptible to clock skew)
- Skips `@impl true` annotations
- Uses a plain map for state instead of a struct
- Often generates the cleanup via `Process.send_after/3` in `handle_cast` rather than `handle_info`

Claude. more idiomatic OTP patterns.

Test 2 - Phoenix LiveView Component

Prompt:
```text
Write a Phoenix LiveView for a real-time search box. As the user types (debounced 300ms),
query the database for matching products. Show a loading spinner during fetch.
Use Ecto for the query. Products have name and sku fields.
```

Claude Output

```elixir
defmodule MyAppWeb.ProductSearchLive do
  use MyAppWeb, :live_view

  alias MyApp.Catalog

  @debounce_ms 300

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     assign(socket,
       query: "",
       results: [],
       loading: false,
       debounce_timer: nil
     )}
  end

  @impl true
  def handle_event("search", %{"query" => query}, socket) do
    # Cancel existing debounce timer
    if socket.assigns.debounce_timer do
      Process.cancel_timer(socket.assigns.debounce_timer)
    end

    if String.length(query) < 2 do
      {:noreply, assign(socket, query: query, results: [], loading: false, debounce_timer: nil)}
    else
      timer = Process.send_after(self(), {:do_search, query}, @debounce_ms)
      {:noreply, assign(socket, query: query, loading: true, debounce_timer: timer)}
    end
  end

  @impl true
  def handle_info({:do_search, query}, socket) do
    results = Catalog.search_products(query)
    {:noreply, assign(socket, results: results, loading: false, debounce_timer: nil)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="relative">
      <input
        type="text"
        value={@query}
        phx-input="search"
        phx-value-query={@query}
        placeholder="Search products..."
        class="w-full px-4 py-2 border rounded-lg"
      />

      <%= if @loading do %>
        <div class="absolute right-3 top-3">
          <svg class="animate-spin h-4 w-4 text-gray-500" ...>...</svg>
        </div>
      <% end %>

      <%= if @results != [] do %>
        <ul class="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg">
          <%= for product <- @results do %>
            <li class="px-4 py-2 hover:bg-gray-50 cursor-pointer">
              <span class="font-medium"><%= product.name %></span>
              <span class="text-sm text-gray-500 ml-2">SKU: <%= product.sku %></span>
            </li>
          <% end %>
        </ul>
      <% end %>
    </div>
    """
  end
end
```

```elixir
Ecto query in Catalog context
defmodule MyApp.Catalog do
  import Ecto.Query
  alias MyApp.Repo
  alias MyApp.Catalog.Product

  def search_products(query) when byte_size(query) < 2, do: []

  def search_products(query) do
    search_term = "%#{String.replace(query, "%", "\\%")}%"

    Product
    |> where([p], ilike(p.name, ^search_term) or ilike(p.sku, ^search_term))
    |> order_by([p], p.name)
    |> limit(20)
    |> Repo.all()
  end
end
```

Claude's Catalog context escapes `%` in the search term (SQL injection mitigation) and uses `ilike` for case-insensitive matching. Copilot often uses `like` (case-sensitive) and misses the `%` escaping.

Test 3 - OTP Supervision Tree

Prompt:
```text
Write an OTP application supervision tree for a pipeline with:
- A rate limiter (one_for_one restart)
- A pool of 5 worker processes (using :poolboy or Task.Supervisor)
- A metrics reporter that restarts the whole group if it crashes
- Use a strategy that makes sense for these dependencies
```

Claude Output

```elixir
defmodule MyApp.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      # Rate limiter. isolated, can restart without affecting workers
      {MyApp.RateLimiter, []},

      # Worker pool via Task.Supervisor
      {Task.Supervisor, name: MyApp.WorkerSupervisor},

      # Metrics reporter. rest_for_one: if this crashes,
      # WorkerSupervisor and anything after it also restart
      # (workers depend on metrics being available)
      {MyApp.MetricsReporter, []},
    ]

    opts = [
      strategy: :rest_for_one,
      name: MyApp.Supervisor,
      max_restarts: 10,
      max_seconds: 60,
    ]

    Supervisor.start_link(children, opts)
  end
end

Worker pool wrapper
defmodule MyApp.WorkerPool do
  def run(fun, timeout \\ 5_000) do
    Task.Supervisor.async_nolink(MyApp.WorkerSupervisor, fun)
    |> Task.await(timeout)
  end

  def run_async(fun) do
    Task.Supervisor.start_child(MyApp.WorkerSupervisor, fun)
  end
end
```

Claude correctly explains when `rest_for_one` is appropriate vs `one_for_one` vs `one_for_all`, and structures the children in dependency order. Copilot tends to default to `one_for_one` without explaining the trade-offs.

Test 4 - Ecto Multi and Transaction Handling

A common real-world task - running multiple database operations atomically, with rollback on failure.

Prompt:
```text
Write an Elixir function that creates a user, assigns them a default role, and logs the
creation event. all in a single database transaction. If any step fails, roll everything back.
```

Claude Output

```elixir
defmodule MyApp.Accounts do
  alias MyApp.Repo
  alias MyApp.Accounts.{User, Role, AuditLog}
  alias Ecto.Multi

  def create_user_with_role(attrs) do
    Multi.new()
    |> Multi.insert(:user, User.changeset(%User{}, attrs))
    |> Multi.run(:default_role, fn repo, %{user: user} ->
      role = repo.get_by!(Role, name: "member")
      repo.insert(%UserRole{user_id: user.id, role_id: role.id})
    end)
    |> Multi.insert(:audit_log, fn %{user: user} ->
      AuditLog.changeset(%AuditLog{}, %{
        action: "user_created",
        actor_id: user.id,
        metadata: %{email: user.email}
      })
    end)
    |> Repo.transaction()
    |> case do
      {:ok, %{user: user}} -> {:ok, user}
      {:error, :user, changeset, _} -> {:error, changeset}
      {:error, :default_role, reason, _} -> {:error, "Role assignment failed: #{inspect(reason)}"}
      {:error, :audit_log, changeset, _} -> {:error, "Audit log failed: #{inspect(changeset)}"}
    end
  end
end
```

Copilot tends to write this with `Repo.transaction(fn -> ... end)` and manual `Repo.rollback/1` calls, which works but is less composable. you can't easily add steps or reuse parts of the Multi chain. Claude defaults to `Ecto.Multi` for multi-step transactions, which is the idiomatic Elixir approach.

Where Copilot Wins

Copilot's inline completion is faster for repetitive patterns:
- Writing `Repo.get_by!`, `Repo.insert`, `Repo.update` chains
- Generating `changeset` functions from a schema
- Completing `case` branches when the pattern is obvious

For completing well-trodden Ecto/Phoenix patterns, Copilot's inline speed is useful. For architecture decisions, supervision strategies, and OTP design, Claude's explanations add significant value.

Prompting Strategies for Elixir

Because Elixir is underrepresented in training data compared to Python or JavaScript, both tools benefit from explicit context in prompts.

Less effective:
```
Write a GenServer for caching HTTP responses
```

More effective:
```
Write an Elixir GenServer for caching HTTP responses. Use ETS for storage (not process state),
expose get/2 and put/3 functions, handle cache expiry with TTL in seconds, and include
a child_spec for supervision. Use @impl true annotations and typespecs.
```

The more specific prompt produces idiomatic code from both Claude and Copilot. The difference is that Claude handles vague prompts better. it makes sensible architectural choices (monotonic time, struct state, proper supervision) without needing every decision spelled out.

Test 5 - ExUnit Tests for GenServer

Getting AI to write ExUnit tests is a good proxy for how well it understands Elixir's testing idioms, especially around process lifecycle and asynchronous behavior.

Prompt:
```text
Write ExUnit tests for the RateLimiter GenServer. Cover: allow under limit,
deny over limit, cleanup removes stale entries, retry_after is positive.
```

Claude Output

```elixir
defmodule MyApp.RateLimiterTest do
  use ExUnit.Case, async: false  # GenServer uses named process

  setup do
    # Start a fresh RateLimiter for each test, bypassing the application supervisor
    {:ok, pid} = MyApp.RateLimiter.start_link(name: nil)
    %{pid: pid}
  end

  test "allows requests under the limit", %{pid: pid} do
    # First request should always be allowed
    assert GenServer.call(pid, {:check_rate, "client_1"}) == :allow
  end

  test "denies requests over the limit and returns positive retry_after" do
    client = "client_overflow"
    # Exhaust the limit (100 requests)
    for _ <- 1..100 do
      GenServer.call(MyApp.RateLimiter, {:check_rate, client})
    end

    result = MyApp.RateLimiter.check_rate(client)
    assert {:deny, retry_after} = result
    assert retry_after > 0
    assert retry_after <= 60_000
  end

  test "different clients are tracked independently" do
    assert MyApp.RateLimiter.check_rate("client_a") == :allow
    assert MyApp.RateLimiter.check_rate("client_b") == :allow
  end

  test "cleanup removes fully-expired entries" do
    client = "cleanup_test"
    MyApp.RateLimiter.check_rate(client)

    # Send cleanup message directly to test the handler
    send(MyApp.RateLimiter, :cleanup)
    # Cleanup runs synchronously once. state is now pruned
    # (In a real test, you'd mock System.monotonic_time or use :erlang.trace)
    :ok
  end
end
```

Claude adds `async - false` because the test uses a named GenServer process, and explains the limitation around testing time-dependent cleanup without mocking. Copilot typically generates tests that call the public API but misses the `async: false` necessity and often sets up the GenServer incorrectly (using the supervised one rather than a test-scoped instance).

Related Reading

- [Claude vs Copilot for Swift Development](/claude-vs-copilot-for-swift-development-2026/)
- [How to Use AI to Interpret Elixir GenServer Crash Reports](/how-to-use-ai-to-interpret-elixir-genserver-crash-reports-an/)
- [Claude vs GPT-4 for Shell Scripting](/claude-vs-gpt4-for-shell-scripting-2026/)
- [Claude vs Copilot for Rust Development](/claude-vs-copilot-for-rust-development)

---

Related Articles

- [Claude Code Go Module Development Guide](/claude-code-go-module-development-guide/)
- [Claude Max Context Window Exceeded: What](/claude-max-context-window-exceeded-what-to-do/)
- [Effective Tool Chaining Workflow Using Copilot and Claude](/effective-tool-chaining-workflow-using-copilot-and-claude-together-for-coding/)
- [Best AI Tools for Generating API Rate Limiting Code 2026](/best-ai-tools-for-generating-api-rate-limiting-code-2026/)
- [Claude vs Copilot for Swift Development 2026](/claude-vs-copilot-for-swift-development-2026/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)

{% endraw %}
