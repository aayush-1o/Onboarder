/**
 * Service Detector Utility
 * Detects required services (databases, caches, queues) from project analysis
 */

/**
 * Detect all required services from analysis
 */
function detectRequiredServices(analysis, dependencies) {
    const services = {
        databases: [],
        caches: [],
        messageQueues: [],
        others: []
    };

    if (!analysis || !dependencies) {
        return services;
    }

    // Detect databases
    services.databases = detectDatabases(analysis, dependencies);

    // Detect caches
    services.caches = detectCaches(dependencies);

    // Detect message queues
    services.messageQueues = detectMessageQueues(dependencies);

    return services;
}

/**
 * Detect databases from dependencies and analysis
 */
function detectDatabases(analysis, dependencies) {
    const databases = [];
    const deps = dependencies.runtime || [];

    // MongoDB
    if (deps.some(d => ['mongodb', 'mongoose'].includes(d.name.toLowerCase()))) {
        databases.push({ type: 'mongodb', detected: 'dependency' });
    }

    // PostgreSQL
    if (deps.some(d => ['pg', 'pg-promise', 'sequelize', 'typeorm'].includes(d.name.toLowerCase()))) {
        databases.push({ type: 'postgresql', detected: 'dependency' });
    }

    // MySQL
    if (deps.some(d => ['mysql', 'mysql2'].includes(d.name.toLowerCase()))) {
        databases.push({ type: 'mysql', detected: 'dependency' });
    }

    // Redis (can be cache or database)
    if (deps.some(d => ['redis', 'ioredis'].includes(d.name.toLowerCase()))) {
        const existing = databases.find(db => db.type === 'redis');
        if (!existing) {
            databases.push({ type: 'redis', detected: 'dependency' });
        }
    }

    // Also check analysis.databases from Day 4
    if (analysis.databases && analysis.databases.length > 0) {
        analysis.databases.forEach(dbName => {
            const type = dbName.toLowerCase();
            const existing = databases.find(db => db.type === type);
            if (!existing) {
                databases.push({ type, detected: 'analysis' });
            }
        });
    }

    return databases;
}

/**
 * Detect cache systems
 */
function detectCaches(dependencies) {
    const caches = [];
    const deps = dependencies.runtime || [];

    // Redis (as cache)
    if (deps.some(d => ['redis', 'ioredis', 'redis-client'].includes(d.name.toLowerCase()))) {
        caches.push({ type: 'redis', detected: 'dependency' });
    }

    // Memcached
    if (deps.some(d => ['memcached', 'memcache'].includes(d.name.toLowerCase()))) {
        caches.push({ type: 'memcached', detected: 'dependency' });
    }

    return caches;
}

/**
 * Detect message queues
 */
function detectMessageQueues(dependencies) {
    const queues = [];
    const deps = dependencies.runtime || [];

    // RabbitMQ
    if (deps.some(d => ['amqplib', 'amqp', 'rabbitmq'].includes(d.name.toLowerCase()))) {
        queues.push({ type: 'rabbitmq', detected: 'dependency' });
    }

    // Kafka
    if (deps.some(d => ['kafkajs', 'kafka-node', 'node-rdkafka'].includes(d.name.toLowerCase()))) {
        queues.push({ type: 'kafka', detected: 'dependency' });
    }

    return queues;
}

/**
 * Get database configuration
 */
function getDatabaseConfig(dbType) {
    const configs = {
        mongodb: {
            image: 'mongo:7',
            port: 27017,
            volumePath: '/data/db',
            envVars: [
                { key: 'MONGO_INITDB_ROOT_USERNAME', value: 'admin' },
                { key: 'MONGO_INITDB_ROOT_PASSWORD', value: 'password123' }
            ],
            healthCheck: '["CMD", "mongosh", "--eval", "db.adminCommand(\'ping\')"]',
            connectionString: 'mongodb://admin:password123@{{DB_SERVICE_NAME}}:27017/{{DB_NAME}}?authSource=admin',
            envKey: 'MONGODB_URI'
        },
        postgresql: {
            image: 'postgres:15-alpine',
            port: 5432,
            volumePath: '/var/lib/postgresql/data',
            envVars: [
                { key: 'POSTGRES_USER', value: 'postgres' },
                { key: 'POSTGRES_PASSWORD', value: 'password123' },
                { key: 'POSTGRES_DB', value: '{{DB_NAME}}' }
            ],
            healthCheck: '["CMD-SHELL", "pg_isready -U postgres"]',
            connectionString: 'postgresql://postgres:password123@{{DB_SERVICE_NAME}}:5432/{{DB_NAME}}',
            envKey: 'DATABASE_URL'
        },
        mysql: {
            image: 'mysql:8-debian',
            port: 3306,
            volumePath: '/var/lib/mysql',
            envVars: [
                { key: 'MYSQL_ROOT_PASSWORD', value: 'password123' },
                { key: 'MYSQL_DATABASE', value: '{{DB_NAME}}' },
                { key: 'MYSQL_USER', value: 'user' },
                { key: 'MYSQL_PASSWORD', value: 'password123' }
            ],
            healthCheck: '["CMD", "mysqladmin", "ping", "-h", "localhost"]',
            connectionString: 'mysql://user:password123@{{DB_SERVICE_NAME}}:3306/{{DB_NAME}}',
            envKey: 'DATABASE_URL'
        },
        redis: {
            image: 'redis:7-alpine',
            port: 6379,
            volumePath: '/data',
            envVars: [],
            healthCheck: '["CMD", "redis-cli", "ping"]',
            connectionString: 'redis://{{DB_SERVICE_NAME}}:6379',
            envKey: 'REDIS_URL'
        }
    };

    return configs[dbType] || null;
}

/**
 * Get cache configuration
 */
function getCacheConfig(cacheType) {
    const configs = {
        redis: {
            image: 'redis:7-alpine',
            port: 6379,
            volumePath: '/data',
            connectionString: 'redis://{{CACHE_SERVICE_NAME}}:6379',
            envKey: 'REDIS_URL'
        },
        memcached: {
            image: 'memcached:1.6-alpine',
            port: 11211,
            volumePath: null,
            connectionString: '{{CACHE_SERVICE_NAME}}:11211',
            envKey: 'MEMCACHED_SERVERS'
        }
    };

    return configs[cacheType] || null;
}

/**
 * Get message queue configuration
 */
function getMessageQueueConfig(queueType) {
    const configs = {
        rabbitmq: {
            image: 'rabbitmq:3-management-alpine',
            port: 5672,
            managementPort: 15672,
            envVars: [
                { key: 'RABBITMQ_DEFAULT_USER', value: 'admin' },
                { key: 'RABBITMQ_DEFAULT_PASS', value: 'password123' }
            ],
            connectionString: 'amqp://admin:password123@{{QUEUE_SERVICE_NAME}}:5672',
            envKey: 'RABBITMQ_URL'
        },
        kafka: {
            image: 'bitnami/kafka:latest',
            port: 9092,
            envVars: [
                { key: 'KAFKA_CFG_ZOOKEEPER_CONNECT', value: 'zookeeper:2181' }
            ],
            connectionString: '{{QUEUE_SERVICE_NAME}}:9092',
            envKey: 'KAFKA_BROKERS'
        }
    };

    return configs[queueType] || null;
}

module.exports = {
    detectRequiredServices,
    detectDatabases,
    detectCaches,
    detectMessageQueues,
    getDatabaseConfig,
    getCacheConfig,
    getMessageQueueConfig
};
