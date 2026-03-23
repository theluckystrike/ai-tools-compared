---
layout: default
title: "Best AI Tools for Writing Ansible Playbooks"
description: "Compare Claude, Copilot, and Cursor for generating Ansible playbooks — role structures, idempotency, vault secrets, and Jinja2 templates with real examples"
date: 2026-03-22
author: theluckystrike
permalink: ai-tools-for-writing-ansible-playbooks-guide
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

Ansible is one of the domains where AI tools diverge most sharply from each other. Writing correct Ansible means understanding idempotency, knowing which modules handle their own idempotency vs which need `when` guards, and generating Jinja2 templates that don't silently fail. This guide tests Claude Code, GitHub Copilot, and Cursor on real playbook tasks.

## Task 1: Deploy a Web App with Nginx and Systemd

**Prompt:** "Write an Ansible role that deploys a Python FastAPI app with nginx as a reverse proxy and systemd as the process manager. Should be idempotent."

**Copilot's key issue — the service restart task:**

```yaml
# Copilot generated this
- name: Restart nginx
  service:
    name: nginx
    state: restarted  # WRONG: always restarts, breaking idempotency
```

**Claude's approach:**

```yaml
# roles/fastapi-app/tasks/main.yml
---
- name: Install system dependencies
  ansible.builtin.package:
    name:
      - python3
      - python3-pip
      - python3-venv
      - nginx
    state: present
  become: true

- name: Create app user
  ansible.builtin.user:
    name: "{{ app_user }}"
    system: true
    shell: /sbin/nologin
    create_home: false
  become: true

- name: Create app directories
  ansible.builtin.file:
    path: "{{ item }}"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_user }}"
    mode: "0755"
  loop:
    - "{{ app_dir }}"
    - "{{ app_dir }}/logs"
    - /etc/{{ app_name }}
  become: true

- name: Copy application code
  ansible.builtin.copy:
    src: "{{ playbook_dir }}/files/app/"
    dest: "{{ app_dir }}"
    owner: "{{ app_user }}"
    group: "{{ app_user }}"
    mode: "0644"
  become: true
  notify: Restart app service  # Notifies handler, not direct restart

- name: Install Python dependencies in virtualenv
  ansible.builtin.pip:
    requirements: "{{ app_dir }}/requirements.txt"
    virtualenv: "{{ app_dir }}/venv"
    virtualenv_command: python3 -m venv
  become: true
  become_user: "{{ app_user }}"

- name: Deploy systemd unit file
  ansible.builtin.template:
    src: app.service.j2
    dest: /etc/systemd/system/{{ app_name }}.service
    owner: root
    group: root
    mode: "0644"
  become: true
  notify:
    - Reload systemd
    - Restart app service

- name: Enable and start app service
  ansible.builtin.systemd:
    name: "{{ app_name }}"
    state: started
    enabled: true
    daemon_reload: false  # Handled by handler
  become: true

- name: Deploy nginx configuration
  ansible.builtin.template:
    src: nginx-site.conf.j2
    dest: /etc/nginx/sites-available/{{ app_name }}
    owner: root
    group: root
    mode: "0644"
    validate: nginx -t -c /dev/null  # Validate config before deploying
  become: true
  notify: Reload nginx

- name: Enable nginx site
  ansible.builtin.file:
    src: /etc/nginx/sites-available/{{ app_name }}
    dest: /etc/nginx/sites-enabled/{{ app_name }}
    state: link
  become: true
  notify: Reload nginx
```

```yaml
# roles/fastapi-app/handlers/main.yml
---
- name: Reload systemd
  ansible.builtin.systemd:
    daemon_reload: true
  become: true

- name: Restart app service
  ansible.builtin.systemd:
    name: "{{ app_name }}"
    state: restarted
  become: true

- name: Reload nginx
  ansible.builtin.service:
    name: nginx
    state: reloaded  # Reload, not restart — zero downtime
  become: true
```

Key differences from Copilot's version:
- Uses `notify` + handlers instead of direct restarts — truly idempotent
- Uses `reload` not `restart` for nginx — zero downtime config changes
- Validates nginx config before deploying with `validate:`
- Correct `become_user` for virtualenv creation

## Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


### Step 1: Task 2: Jinja2 Templates

```jinja2
{# roles/fastapi-app/templates/app.service.j2 #}
[Unit]
Description={{ app_description | default(app_name + " application") }}
After=network.target
Wants=network.target

[Service]
Type=exec
User={{ app_user }}
Group={{ app_user }}
WorkingDirectory={{ app_dir }}
Environment="PATH={{ app_dir }}/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin"
Environment="PYTHONUNBUFFERED=1"
{% for key, value in app_env_vars.items() %}
Environment="{{ key }}={{ value }}"
{% endfor %}
ExecStart={{ app_dir }}/venv/bin/uvicorn {{ app_module }}:app \
    --host 127.0.0.1 \
    --port {{ app_port | default(8000) }} \
    --workers {{ app_workers | default(2) }}
ExecReload=/bin/kill -s HUP $MAINPID
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier={{ app_name }}

[Install]
WantedBy=multi-user.target
```

### Step 2: Task 3: Vault-Encrypted Secrets

**Prompt:** "Write an Ansible task file that reads database credentials from Ansible Vault and configures a .env file."

**Cursor's output:**

```yaml
# Cursor — stores secrets in plaintext in the task
- name: Write env file
  copy:
    content: |
      DB_PASSWORD={{ db_password }}
    dest: /app/.env
```

No vault usage, plaintext secret in the task output.

**Claude's output:**

```yaml
# group_vars/production/vault.yml (encrypted with ansible-vault)
# ansible-vault encrypt group_vars/production/vault.yml
vault_db_password: "{{ lookup('env', 'VAULT_DB_PASSWORD') }}"
vault_db_host: "db.internal.example.com"
vault_api_key: "sk-prod-..."
```

```yaml
# group_vars/production/vars.yml (not encrypted — references vault vars)
db_password: "{{ vault_db_password }}"
db_host: "{{ vault_db_host }}"
api_key: "{{ vault_api_key }}"
```

```yaml
# tasks/configure_env.yml
---
- name: Write application .env file from vault secrets
  ansible.builtin.template:
    src: dotenv.j2
    dest: "{{ app_dir }}/.env"
    owner: "{{ app_user }}"
    group: "{{ app_user }}"
    mode: "0600"  # Restrictive — only app user can read
  become: true
  no_log: true  # Prevents secrets from appearing in Ansible output
```

```jinja2
{# templates/dotenv.j2 #}
# Generated by Ansible — do not edit manually
DATABASE_URL=postgresql://{{ db_user }}:{{ db_password }}@{{ db_host }}:{{ db_port }}/{{ db_name }}
API_KEY={{ api_key }}
SECRET_KEY={{ secret_key }}
DEBUG=false
```

Claude knew to:
- Use the two-file vault pattern (vault.yml + vars.yml)
- Set `mode: "0600"` for secret files
- Add `no_log: true` to prevent secret exposure in logs

### Step 3: Task 4: Molecule Testing

```yaml
# molecule/default/converge.yml — generated by Claude
---
- name: Converge
  hosts: all
  become: true
  vars:
    app_name: myapp
    app_user: myapp
    app_dir: /opt/myapp
    app_module: main
    app_port: 8000
    app_env_vars:
      ENVIRONMENT: test

  pre_tasks:
    - name: Update apt cache
      ansible.builtin.apt:
        update_cache: true
        cache_valid_time: 3600
      when: ansible_os_family == "Debian"

  roles:
    - role: fastapi-app
```

```yaml
# molecule/default/verify.yml — Claude's verification playbook
---
- name: Verify
  hosts: all
  tasks:
    - name: Check app service is running
      ansible.builtin.systemd:
        name: myapp
      register: service_status
      failed_when: service_status.status.ActiveState != "active"

    - name: Check app responds on port 8000
      ansible.builtin.uri:
        url: http://localhost:8000/health
        status_code: 200
      retries: 3
      delay: 2

    - name: Verify nginx is serving the app
      ansible.builtin.uri:
        url: http://localhost/health
        status_code: 200

    - name: Check .env file permissions
      ansible.builtin.stat:
        path: /opt/myapp/.env
      register: env_file
      failed_when: env_file.stat.mode != "0600"
```

## Tool Summary

| Capability | Claude Code | Copilot | Cursor |
|---|---|---|---|
| Idempotency | Handlers, not direct restarts | Direct restart anti-patterns | Mixed |
| Vault usage | Two-file pattern, no_log | Plaintext in tasks | Basic |
| FQCN modules | Uses `ansible.builtin.*` | Short names (deprecated) | Mixed |
| Jinja2 templates | Complex conditionals correct | Basic templates | Correct |
| Molecule tests | Full converge + verify | No molecule knowledge | Partial |

Claude Code is the clear choice for production Ansible work. The `ansible.builtin.*` FQCN usage alone avoids a common upgrade-breaking pattern.

## Troubleshooting

**Configuration changes not taking effect**

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

**Permission denied errors**

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

**Connection or network-related failures**

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


## Related Articles

- [Best AI Tools for Writing Ansible Playbooks and Roles](/best-ai-tools-for-writing-ansible-playbooks-and-roles-automatically/)
- [Best AI Tools for Writing Ansible Playbooks 2026](/best-ai-tools-for-writing-ansible-playbooks-2026/)
- [Which AI Writes Better Ansible Playbooks Copilot or Claude](/which-ai-writes-better-ansible-playbooks-copilot-or-claude-c/)
- [AI Tools for Writing App Store Descriptions 2026](/ai-tools-for-writing-app-store-descriptions-2026/)
- [Best AI Tools for Writing Nginx Configurations](/ai-tools-for-nginx-configuration)
Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}
