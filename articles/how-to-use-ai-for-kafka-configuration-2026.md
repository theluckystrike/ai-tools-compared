---
layout: default
title: "How to Use AI for Kafka Configuration 2026"
description: "Use Claude and ChatGPT to generate Kafka broker configs, topic settings, consumer group tuning, and Kafka Streams topologies with real examples"
date: 2026-03-22
author: theluckystrike
permalink: /how-to-use-ai-for-kafka-configuration-2026/
categories: [guides]
reviewed: true
score: 9
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence]
---

{% raw %}

How to Use AI for Kafka Configuration 2026

Kafka configuration is dense: dozens of broker properties, topic-level overrides, consumer group settings, and producer tuning knobs. all with production implications if misconfigured. AI tools can generate correct starting points, but you need to understand what to ask for.

Broker Configuration

Prompt to Claude:
```text
Generate a production-grade Kafka broker server.properties for a 3-broker cluster.
Requirements:
- Retention: 7 days, max 100GB per topic
- Replication factor: 3, min ISR: 2
- Enable log compaction as default
- TLS for internal and client communication
- JMX enabled on port 9999
- Adjust OS-level socket buffer settings
Include comments explaining each critical setting.
```

Claude output:

```properties
========================
Broker Identity
========================
broker.id=1  # Unique per broker; override in each broker's config

========================
Zookeeper / KRaft
========================
For KRaft mode (Kafka 3.3+), replace with:
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@broker1:9093,2@broker2:9093,3@broker3:9093
zookeeper.connect=zookeeper1:2181,zookeeper2:2181,zookeeper3:2181/kafka

========================
Network
========================
listeners=PLAINTEXT://:9092,SSL://:9093
advertised.listeners=PLAINTEXT://broker1.internal:9092,SSL://broker1.internal:9093
listener.security.protocol.map=PLAINTEXT:PLAINTEXT,SSL:SSL

TLS/SSL settings
ssl.keystore.location=/etc/kafka/ssl/broker.keystore.jks
ssl.keystore.password=${env:SSL_KEYSTORE_PASSWORD}
ssl.key.password=${env:SSL_KEY_PASSWORD}
ssl.truststore.location=/etc/kafka/ssl/broker.truststore.jks
ssl.truststore.password=${env:SSL_TRUSTSTORE_PASSWORD}
ssl.endpoint.identification.algorithm=https
ssl.client.auth=required

========================
Log Storage
========================
log.dirs=/data/kafka/logs
num.recovery.threads.per.data.dir=4

Retention: 7 days
log.retention.hours=168

Max 100GB per partition (set per-topic if needed)
log.retention.bytes=107374182400

Log compaction enabled by default
log.cleanup.policy=compact,delete

Segment size: roll every 1GB or 7 days
log.segment.bytes=1073741824
log.roll.hours=168

========================
Replication
========================
default.replication.factor=3
min.insync.replicas=2

Unclean leader election disabled (prefer availability loss over data loss)
unclean.leader.election.enable=false

========================
Performance
========================
Socket buffer sizes (match OS net.core.rmem_max / wmem_max)
socket.send.buffer.bytes=1048576
socket.receive.buffer.bytes=1048576
socket.request.max.bytes=104857600

num.network.threads=8
num.io.threads=16
queued.max.requests=500

========================
JMX
========================
Set in KAFKA_JMX_OPTS env:
-Dcom.sun.jmanagement.jmxremote
-Dcom.sun.jmx.remote.port=9999
-Dcom.sun.jmx.remote.authenticate=false
-Dcom.sun.jmx.remote.ssl=false
```

Claude covers KRaft mode as an alternative (correct for Kafka 3.3+), uses environment variable references for secrets instead of plaintext passwords, and explicitly disables `unclean.leader.election.enable`. a critical safety setting it notes correctly.

Topic Configuration

Prompt:
```text
Generate Kafka AdminClient Python code to create a topic called "order-events"
with 12 partitions, replication factor 3, 24-hour retention, compact+delete cleanup,
and max message size 5MB. Use confluent-kafka.
```

```python
from confluent_kafka.admin import AdminClient, NewTopic, ConfigResource
from confluent_kafka.admin import ConfigEntry

admin = AdminClient({"bootstrap.servers": "broker1:9093,broker2:9093,broker3:9093",
                     "security.protocol": "SSL",
                     "ssl.ca.location": "/etc/kafka/ssl/ca.pem",
                     "ssl.certificate.location": "/etc/kafka/ssl/client.pem",
                     "ssl.key.location": "/etc/kafka/ssl/client.key"})

TOPIC = "order-events"

Create topic
new_topic = NewTopic(
    TOPIC,
    num_partitions=12,
    replication_factor=3,
    config={
        "retention.ms": str(24 * 60 * 60 * 1000),   # 24 hours
        "cleanup.policy": "compact,delete",
        "max.message.bytes": str(5 * 1024 * 1024),   # 5MB
        "min.insync.replicas": "2",
        "compression.type": "lz4",
    }
)

result = admin.create_topics([new_topic])
for topic, future in result.items():
    try:
        future.result()
        print(f"Topic '{topic}' created successfully")
    except Exception as e:
        print(f"Failed to create topic '{topic}': {e}")
```

Consumer Group Tuning

Prompt:
```text
Write a Kafka consumer configuration for a high-throughput order processor.
Requirements: manual commit, fetch 10MB batches, poll timeout 500ms,
session timeout 30s, max poll records 500, partition assignment: sticky.
Java properties format.
```

```properties
Consumer group
group.id=order-processor-v2
client.id=order-processor-${hostname}

Offset management. manual commit
enable.auto.commit=false
auto.offset.reset=earliest

Fetch tuning. large batches
fetch.min.bytes=1048576          # Wait for at least 1MB before returning
fetch.max.bytes=10485760         # Max 10MB per fetch request
max.partition.fetch.bytes=2097152 # Max 2MB per partition per fetch

Poll settings
max.poll.records=500
max.poll.interval.ms=300000      # 5 min max between polls before rebalance

Session and heartbeat
session.timeout.ms=30000
heartbeat.interval.ms=10000      # Must be < session.timeout / 3

Partition assignment. sticky reduces rebalance overhead
partition.assignment.strategy=org.apache.kafka.clients.consumer.StickyAssignor

Performance
receive.buffer.bytes=1048576
request.timeout.ms=30000
```

Kafka Streams Topology

Prompt:
```text
Write a Kafka Streams topology in Java that:
1. Reads from "orders" topic (JSON: {orderId, userId, amount, status})
2. Filters for status="PAID"
3. Groups by userId and computes total spend (running sum) with a tumbling 1-hour window
4. Writes results to "user-spend-hourly" topic
```

```java
StreamsBuilder builder = new StreamsBuilder();

ObjectMapper mapper = new ObjectMapper();

KStream<String, JsonNode> orders = builder.stream(
    "orders",
    Consumed.with(Serdes.String(), new JsonSerde())
);

orders
    .filter((key, value) ->
        value != null && "PAID".equals(value.get("status").asText()))
    .selectKey((key, value) -> value.get("userId").asText())
    .groupByKey(Grouped.with(Serdes.String(), new JsonSerde()))
    .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofHours(1)))
    .aggregate(
        () -> 0.0,
        (userId, order, totalSpend) ->
            totalSpend + order.get("amount").asDouble(),
        Materialized.<String, Double, WindowStore<Bytes, byte[]>>as("user-spend-store")
            .withValueSerde(Serdes.Double())
    )
    .toStream()
    .map((windowedKey, totalSpend) -> {
        ObjectNode result = mapper.createObjectNode();
        result.put("userId", windowedKey.key());
        result.put("windowStart", windowedKey.window().start());
        result.put("windowEnd", windowedKey.window().end());
        result.put("totalSpend", totalSpend);
        return KeyValue.pair(windowedKey.key(), (JsonNode) result);
    })
    .to("user-spend-hourly", Produced.with(Serdes.String(), new JsonSerde()));
```

Claude uses `ofSizeWithNoGrace` (Kafka Streams 3.0+ API) rather than the deprecated `of()`, which is the correct modern pattern.

Producer Configuration for High Durability

When you need guaranteed delivery with no data loss, producer settings matter as much as broker settings.

Prompt:
```text
Write a Kafka producer configuration for a financial transactions system.
Requirements: exactly-once semantics, max latency 100ms, acks=all,
compression lz4, idempotent producer, retry on transient failures.
Java properties format with comments.
```

```properties
Producer identity
client.id=payments-producer-${hostname}

Durability: require all in-sync replicas to acknowledge
acks=all

Idempotent producer. prevents duplicate messages on retry
enable.idempotence=true

Exactly-once semantics (requires idempotence=true)
transactional.id=payments-producer-${hostname}-${pid}

Retries: retry up to 10 times with backoff
retries=10
retry.backoff.ms=100
delivery.timeout.ms=120000       # 2 min total delivery timeout

Batching: balance latency vs throughput
linger.ms=5                      # Wait up to 5ms for batch fill
batch.size=65536                 # 64KB batch size

Compression
compression.type=lz4

Buffer and request sizing
buffer.memory=33554432           # 32MB producer buffer
max.request.size=5242880         # 5MB max single message

Timeouts
request.timeout.ms=30000
metadata.max.age.ms=300000
```

The key insight Claude surfaces here: `enable.idempotence=true` automatically sets `acks=all` and `max.in.flight.requests.per.connection=5` if not explicitly set. Setting `transactional.id` upgrades to exactly-once but requires wrapping sends in `beginTransaction()` / `commitTransaction()` blocks in your application code.

Schema Registry Integration

Modern Kafka deployments use Confluent Schema Registry to enforce message contracts. AI excels at generating the boilerplate for schema-aware producers and consumers.

Prompt:
```text
Write Python code to produce Avro-encoded messages to Kafka using
confluent-kafka with Schema Registry. Schema: {orderId: string, amount: float,
timestamp: long}. Include schema registration and both producer and consumer.
```

```python
from confluent_kafka import Producer, Consumer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer, AvroDeserializer
from confluent_kafka.serialization import SerializationContext, MessageField
import time

SCHEMA_STR = """
{
  "type": "record",
  "name": "Order",
  "namespace": "com.example.orders",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "amount",  "type": "float"},
    {"name": "timestamp", "type": "long", "logicalType": "timestamp-millis"}
  ]
}
"""

schema_registry_conf = {"url": "http://schema-registry:8081"}
sr_client = SchemaRegistryClient(schema_registry_conf)

avro_serializer = AvroSerializer(
    sr_client,
    SCHEMA_STR,
    lambda obj, ctx: obj,  # dict passthrough
)

avro_deserializer = AvroDeserializer(
    sr_client,
    SCHEMA_STR,
    lambda obj, ctx: obj,
)

Producer
producer_conf = {
    "bootstrap.servers": "broker1:9093",
    "security.protocol": "SSL",
    "ssl.ca.location": "/etc/kafka/ssl/ca.pem",
}
producer = Producer(producer_conf)

def produce_order(order_id: str, amount: float):
    order = {
        "orderId": order_id,
        "amount": amount,
        "timestamp": int(time.time() * 1000),
    }
    producer.produce(
        topic="orders",
        key=order_id,
        value=avro_serializer(order, SerializationContext("orders", MessageField.VALUE)),
        on_delivery=lambda err, msg: print(f"Delivered: {msg.offset()}" if not err else f"Error: {err}"),
    )
    producer.flush()

Consumer
consumer_conf = {
    "bootstrap.servers": "broker1:9093",
    "group.id": "order-processor",
    "auto.offset.reset": "earliest",
    "enable.auto.commit": False,
    "security.protocol": "SSL",
    "ssl.ca.location": "/etc/kafka/ssl/ca.pem",
}
consumer = Consumer(consumer_conf)
consumer.subscribe(["orders"])

while True:
    msg = consumer.poll(timeout=1.0)
    if msg is None:
        continue
    if msg.error():
        print(f"Consumer error: {msg.error()}")
        continue
    order = avro_deserializer(msg.value(), SerializationContext("orders", MessageField.VALUE))
    print(f"Received order: {order}")
    consumer.commit(message=msg)
```

Claude correctly registers the schema automatically via `AvroSerializer` on first produce. no separate schema registration step required. It also uses the logical type `timestamp-millis` annotation on the Avro schema so downstream consumers can interpret the long as a proper timestamp.

Troubleshooting with AI

AI is also useful for diagnosing Kafka issues from log snippets or metric descriptions.

Prompt:
```text
My Kafka consumer is lagging 500k messages on partition 3 of the "orders" topic.
Consumer group: order-processor. The consumer CPU is at 10%, network is fine.
What are the most likely causes and how do I investigate?
```

Claude's diagnostic response:

1. Processing bottleneck downstream. The consumer is fetching but can't process fast enough. Check if your processing code has blocking I/O calls (database writes, HTTP calls) that are serializing within the poll loop. Consider async processing or a thread pool.

2. `max.poll.records` too high. If poll returns 500 records but processing takes 4 minutes, you'll exceed `max.poll.interval.ms` and trigger rebalance, which resets progress. Reduce `max.poll.records` to 50 and measure processing time per batch.

3. Single-partition hotspot. Lag only on partition 3 suggests a key skew issue. Check if one producer key maps disproportionately to partition 3 (`hash(key) % 12`). Consider custom partitioner or rekeying.

4. Investigation commands:

```bash
Check consumer group lag across all partitions
kafka-consumer-groups.sh --bootstrap-server broker1:9093 \
  --group order-processor --describe

Check producer throughput per partition
kafka-log-dirs.sh --bootstrap-server broker1:9093 \
  --topic-list orders --describe | grep "partition:3"

Monitor consumer lag over time (requires kcat)
kcat -b broker1:9093 -C -t orders -p 3 -o end -e -q | wc -l
```

This kind of structured diagnostic output. triage list plus investigation commands. is where AI saves significant time versus searching documentation.

Related Reading

- [Gemini vs Claude for Writing Apache Kafka Consumer/Producer Config](/gemini-vs-claude-for-writing-apache-kafka-consumer-producer-/)
- [AI-Powered CI/CD Pipeline Optimization](/ai-powered-cicd-pipeline-optimization-2026/)
- [AI-Powered Observability Configuration Tools](/ai-powered-observability-configuration-tools-2026/)

- [AI-Powered API Gateway Configuration Tools 2026](/ai-powered-api-gateway-configuration-tools-2026/)
---

Related Articles

- [Gemini vs Claude for Writing Apache Kafka Consumer Producer](/gemini-vs-claude-for-writing-apache-kafka-consumer-producer-/)
- [Best AI Tools for Writing Nginx Configurations](/ai-tools-for-nginx-configuration)
- [AI Tools for Automated Load Balancer Config 2026](/ai-tools-for-load-balancer-config-2026/)
- [How to Use AI to Generate Serverless Framework Configuration](/how-to-use-ai-to-generate-serverless-framework-configuration/)
- [AI Tools for Generating Nginx Configuration Files 2026](/ai-tools-for-generating-nginx-configuration-files-2026/)

Built by theluckystrike. More at [zovo.one](https://zovo.one)

{% endraw %}
