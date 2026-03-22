---
layout: default
title: "Claude vs Copilot for Python Data Science"
description: "Head-to-head comparison of Claude and GitHub Copilot for Python data science: pandas transforms, sklearn pipelines, visualization, and EDA workflows"
date: 2026-03-22
author: theluckystrike
permalink: /claude-vs-copilot-python-data-science/
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared]
---

{% raw %}

Python data science work spans multiple domains: data wrangling with pandas, statistical modeling with sklearn, visualization with matplotlib/seaborn/plotly, and exploratory analysis in Jupyter. Claude and GitHub Copilot take fundamentally different approaches — Claude as a conversational assistant for complex analysis, Copilot as an inline completion engine. This guide tests both on real data science tasks.

## Task 1: Pandas Data Cleaning Pipeline

**Scenario:** A messy CSV with mixed types, nulls, inconsistent date formats, and duplicate rows. Build a cleaning pipeline.

**Claude (conversational prompt):**

```
I have a sales CSV with these issues:
- 'amount' column has values like "$1,234.56", "1234.56", and nulls
- 'date' column has mixed formats: "2025-03-15", "15/03/2025", "Mar 15, 2025"
- 'customer_id' has duplicates (keep latest by date)
- 'region' column has "US", "usa", "United States" (normalize to ISO)

Write a pandas pipeline using method chaining.
```

**Claude's output:**

```python
import pandas as pd
import numpy as np
from dateutil import parser as dateutil_parser

REGION_MAP = {
    "us": "US", "usa": "US", "united states": "US", "u.s.": "US",
    "uk": "GB", "united kingdom": "GB", "england": "GB",
    "ca": "CA", "canada": "CA",
    # extend as needed
}

def parse_amount(val):
    if pd.isna(val):
        return np.nan
    return float(str(val).replace("$", "").replace(",", "").strip())

def parse_flexible_date(val):
    if pd.isna(val):
        return pd.NaT
    try:
        return dateutil_parser.parse(str(val), dayfirst=False)
    except (ValueError, OverflowError):
        return pd.NaT

def clean_sales(df: pd.DataFrame) -> pd.DataFrame:
    return (
        df
        .assign(
            amount=lambda x: x["amount"].map(parse_amount),
            date=lambda x: x["date"].map(parse_flexible_date),
            region=lambda x: (
                x["region"]
                .str.strip()
                .str.lower()
                .map(REGION_MAP)
                .fillna(x["region"].str.upper())  # keep unknown as-is
            ),
        )
        .dropna(subset=["amount", "date"])
        .sort_values("date", ascending=False)
        .drop_duplicates(subset=["customer_id"], keep="first")
        .reset_index(drop=True)
        .astype({"amount": "float64"})
        .assign(date=lambda x: pd.to_datetime(x["date"]))
    )
```

Claude produces a fully chained pipeline with custom parsers, handles edge cases in region normalization, and uses `dateutil` for flexible date parsing. It also explains why `drop_duplicates(keep="first")` after `sort_values(date, ascending=False)` keeps the latest row.

**Copilot (inline in Jupyter):**

When you type `def clean_sales(df):` and add a comment `# normalize region names, parse currency, parse dates`, Copilot generates a simpler version:

```python
def clean_sales(df):
    # normalize region names
    df['region'] = df['region'].str.upper().str.strip()

    # parse currency
    df['amount'] = df['amount'].str.replace('$', '').str.replace(',', '').astype(float)

    # parse dates
    df['date'] = pd.to_datetime(df['date'], infer_datetime_format=True, errors='coerce')

    # remove duplicates
    df = df.sort_values('date').drop_duplicates('customer_id', keep='last')

    return df
```

Copilot's version is simpler but has issues: `infer_datetime_format=True` is deprecated in pandas 2.x, `.str.replace('$', '')` raises an error on NaN values, and it mutates the input DataFrame instead of returning a clean copy.

**Winner: Claude** — handles edge cases, idiomatic chaining, deprecation-aware.

## Task 2: Sklearn Pipeline with Custom Transformer

**Prompt:** "Build a sklearn pipeline for a classification task. Include: StandardScaler for numeric, OneHotEncoder for categorical, a custom transformer that adds log1p features for skewed numerics, then LogisticRegression. Make it compatible with GridSearchCV."

**Claude:**

```python
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV
import numpy as np
import pandas as pd

class Log1pTransformer(BaseEstimator, TransformerMixin):
    """Applies log1p to columns with skewness above threshold."""

    def __init__(self, skew_threshold: float = 0.5):
        self.skew_threshold = skew_threshold
        self.skewed_cols_: list[int] = []

    def fit(self, X, y=None):
        if isinstance(X, pd.DataFrame):
            X = X.values
        skewness = pd.DataFrame(X).skew()
        self.skewed_cols_ = list(skewness[abs(skewness) > self.skew_threshold].index)
        return self

    def transform(self, X):
        X = np.array(X, dtype=float).copy()
        X[:, self.skewed_cols_] = np.log1p(X[:, self.skewed_cols_])
        return X


def build_pipeline(
    numeric_features: list[str],
    categorical_features: list[str],
) -> Pipeline:
    numeric_transformer = Pipeline([
        ("log1p", Log1pTransformer(skew_threshold=0.5)),
        ("scaler", StandardScaler()),
    ])

    categorical_transformer = OneHotEncoder(
        handle_unknown="ignore",
        sparse_output=False,
    )

    preprocessor = ColumnTransformer([
        ("num", numeric_transformer, numeric_features),
        ("cat", categorical_transformer, categorical_features),
    ])

    return Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", LogisticRegression(max_iter=1000, random_state=42)),
    ])


# GridSearchCV-compatible parameter grid
param_grid = {
    "preprocessor__num__log1p__skew_threshold": [0.3, 0.5, 0.8],
    "classifier__C": [0.01, 0.1, 1.0, 10.0],
    "classifier__solver": ["lbfgs", "saga"],
}

pipeline = build_pipeline(
    numeric_features=["age", "income", "tenure_days"],
    categorical_features=["region", "plan_type"],
)

grid_search = GridSearchCV(
    pipeline, param_grid, cv=5, scoring="roc_auc", n_jobs=-1, verbose=1
)
```

Claude correctly implements the sklearn estimator API (`fit`/`transform`, `BaseEstimator`, `TransformerMixin`) and uses the `__` double-underscore notation for GridSearchCV parameter names.

**Copilot** struggles here without context — it generates a basic pipeline but doesn't implement a proper custom transformer. It typically uses `FunctionTransformer` instead, which doesn't expose hyperparameters for GridSearchCV.

**Winner: Claude** — proper sklearn API, GridSearchCV-compatible custom transformer.

## Task 3: EDA and Visualization

For Jupyter-based EDA, Copilot has an advantage: it sees your DataFrame columns and generates relevant visualizations inline.

**Copilot inline (after loading a DataFrame):**

```python
# Type: # plot distribution of amount by region
# Copilot generates:
import matplotlib.pyplot as plt
import seaborn as sns

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# Distribution plot
sns.histplot(data=df, x='amount', hue='region', bins=30, ax=axes[0])
axes[0].set_title('Amount Distribution by Region')
axes[0].set_xlabel('Amount ($)')

# Box plot for outlier visibility
sns.boxplot(data=df, x='region', y='amount', ax=axes[1])
axes[1].set_title('Amount by Region (Box Plot)')
axes[1].tick_params(axis='x', rotation=45)

plt.tight_layout()
plt.show()
```

Copilot's visualization completions are fast and contextually relevant. Claude requires more prompt effort but generates more sophisticated plots with proper statistical annotations.

## Tool Selection Guide

| Task | Best Tool | Why |
|---|---|---|
| Complex data cleaning pipeline | Claude | Handles edge cases, no deprecation issues |
| Custom sklearn transformers | Claude | Proper API implementation |
| Quick EDA visualizations | Copilot | Inline, sees DataFrame context |
| Statistical analysis explanations | Claude | Interprets results, not just code |
| Boilerplate sklearn pipelines | Copilot | Fast inline completion |
| Debugging pandas errors | Claude | Full error + code context |
| Feature engineering ideas | Claude | Conversational exploration |

## Related Reading

- [Best AI Code Completion for Python Data Science 2026](/ai-tools-compared/best-ai-code-completion-for-python-data-science-2026/)
- [Best AI Coding Tools for Python Data Science and Pandas](/ai-tools-compared/best-ai-coding-tools-for-python-data-science-and-pandas-work/)
- [AI Code Generation for Python FastAPI Endpoints with Pydantic](/ai-tools-compared/ai-code-generation-for-python-fastapi-endpoints-with-pydanti/)

---

Built by theluckystrike — More at [zovo.one](https://zovo.one)

{% endraw %}
