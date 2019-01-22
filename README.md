## Ohara

An easy-to-use visual stream processing tool based on Apache Kafka.

### Getting Started

[TODO]

### Prerequisites

* JDK 1.8+
* Scala 2.12.8
* gradle 5.1+
* Node.js 8.12.0
* Yarn 1.7.0. (Note that you must install the exact version of yarn **1.7.0** as listed here or the **yarn.lock** file in Ohara manager could change when building on different machines)
* Docker 17.05+ (Multi-stage is required in building ohara images, and it is supported by Docker 17.05 or higher. see https://docs.docker.com/develop/develop-images/multistage-build/ for more details)

### Apply header or checkstyle to code base
```
gradle spotlessApply
gradle licenseApply
```

### Installing

[TODO]

### Running all backend-services by docker
(3 brokers, 3 workers, 1 mysql, 1 ftp server and 1 configurator)
```
docker run --rm -p 12345:12345 oharastream/ohara:backend --configuratorPort 12345
```
* configuratorPort: bound by Configurator (default is random)
* zkPort: bound by zookeeper (default is random)
* brokersPort: bound by brokers (default is random). form: port_0,port_1
* workersPort: bound by workers (default is random). form: port_0,port_1
* dbPort: bound by mysql (default is random)
* ftpPort: bound by ftp server (default is random)
* ttl: time to terminate backend-service (default is 365 days)

The backend image is not in production release. Hence, there is no any guarantees to backend image.

### Running configurator by docker
```
docker run --rm -p 12345:12345 oharastream/configurator:0.2-SNAPSHOT --port 12345
```
* port: bound by Configurator (default is random)
* brokers: broker information (ex. host0:port0,host1:port1)
* workers: worker information (ex. host0:port0,host1:port1)

If either brokers or workers is not defined, the configurator will be run with no-cluster mode. It means all data are 
stored in memory. And connector-related commands are executed by nothing.

### Running manager by docker
```
docker run --rm -p 5050:5050 oharastream/manager:0.2-SNAPSHOT --port 5050 --configurator http://localhost:12345/v0
```
* port: bound by manager (default is 5050)
* configurator: basic form of restful API of configurator

### Running all tests

```
gradle clean test
```
NOTED: Some tests in ohara-it require "specified" env. Otherwise, they will be skipped.
see the source code of ohara-it for more details. 

### Building project without manager
```
gradle clean build -PskipManager
```

### build uber jar
```
gradle clean uberJar
```
the uber jar is under ohara-assembly/build/libs/

### Built With

* [Kafka](https://github.com/apache/kafka) - streaming tool
* [AKKA](https://akka.io/) - message-driven tool
* [Gradle](https://gradle.org) - dependency Management
* [SLF4J](https://www.slf4j.org/) - LOG wrapper
* [SCALALOGGING](https://github.com/typesafehub/scalalogging) - LOG wrapper
* [LOG4J](https://logging.apache.org/log4j/2.x/) - log plugin default

### Authors

* **Vito Jeng (vito@is-land.com.tw)** - leader
* **Jack Yang (jack@is-land.com.tw)** - committer
* **Chia-Ping Tsai (chia7712@is-land.com.tw)** - committer
* **Joshua_Lin (joshua@is-land.com.tw)** - committer
* **Geordie Mai (geordie@is-land.com.tw)** - committer
* **Yu-Chen Cheng (yuchen@is-land.com.tw)** - committer
* **Sam Cho (sam@is-land.com.tw)** - committer
* **Chih-Chiang Yeh (harryyeh@is-land.com.tw)** - committer
* **Harry Chiang (harry@is-land.com.tw)** - committer


### License

Ohara is an open source project and available under the Apache 2.0 License.
