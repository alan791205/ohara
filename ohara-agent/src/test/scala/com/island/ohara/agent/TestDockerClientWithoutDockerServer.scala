package com.island.ohara.agent

import com.island.ohara.agent.DockerClient.LIST_PROCESS_FORMAT
import com.island.ohara.agent.DockerJson.{ContainerDescription, PortPair, State}
import com.island.ohara.agent.SshdServer.CommandHandler
import com.island.ohara.agent.TestDockerClientWithoutDockerServer._
import com.island.ohara.common.rule.SmallTest
import com.island.ohara.common.util.{ReleaseOnce, CommonUtil}
import org.junit.{AfterClass, Test}
import org.scalatest.Matchers

import scala.util.Random
class TestDockerClientWithoutDockerServer extends SmallTest with Matchers {
  @Test
  def checkCleanupOption(): Unit = {
    CLIENT
      .executor()
      .command("/bin/bash -c \"ls\"")
      .imageName("centos:latest")
      .dockerCommand()
      .contains("--rm") shouldBe false
    CLIENT
      .executor()
      .command("/bin/bash -c \"ls\"")
      .imageName("centos:latest")
      .cleanup()
      .dockerCommand()
      .contains("--rm") shouldBe true
  }

  private[this] def testSpecifiedContainer(expectedState: State): Unit = {
    val rContainers = CLIENT.containers().filter(_.state == expectedState)
    rContainers.size shouldBe 1
    rContainers.head shouldBe CONTAINERS.find(_.state == expectedState).get
  }
  @Test
  def testCreatedContainers(): Unit = testSpecifiedContainer(State.CREATED)

  @Test
  def testRestartingContainers(): Unit = testSpecifiedContainer(State.RESTARTING)

  @Test
  def testRunningContainers(): Unit = testSpecifiedContainer(State.RUNNING)

  @Test
  def testRemovingContainers(): Unit = testSpecifiedContainer(State.REMOVING)

  @Test
  def testPausedContainers(): Unit = testSpecifiedContainer(State.PAUSED)

  @Test
  def testExitedContainers(): Unit = testSpecifiedContainer(State.EXITED)

  @Test
  def testDeadContainers(): Unit = testSpecifiedContainer(State.DEAD)

  @Test
  def testActiveContainers(): Unit = {
    val rContainers = CLIENT.activeContainers()
    rContainers.size shouldBe 1
    rContainers.head shouldBe CONTAINERS.find(_.state == State.RUNNING).get
  }

  @Test
  def testAllContainers(): Unit = {
    val rContainers = CLIENT.containers()
    rContainers shouldBe CONTAINERS
  }

  @Test
  def testSetHostname(): Unit = {
    val hostname = methodName()
    CLIENT.executor().imageName("aaa").hostname(hostname).dockerCommand().contains(s"-h $hostname") shouldBe true
  }

  @Test
  def testSetEnvs(): Unit = {
    val key = s"key-${methodName()}"
    val value = s"value-${methodName()}"
    CLIENT
      .executor()
      .imageName("aaa")
      .envs(Map(key -> value))
      .dockerCommand()
      .contains(s"""-e \"$key=$value\"""") shouldBe true
  }

  @Test
  def testSetRoute(): Unit = {
    val hostname = methodName()
    val ip = "192.168.103.1"
    CLIENT
      .executor()
      .imageName("aaa")
      .route(Map(hostname -> ip))
      .dockerCommand()
      .contains(s"--add-host $hostname:$ip") shouldBe true
  }

  @Test
  def testSetForwardPorts(): Unit = {
    val port0 = 12345
    val port1 = 12346
    CLIENT
      .executor()
      .imageName("aaa")
      .portMappings(Map(port0 -> port0, port1 -> port1))
      .dockerCommand()
      .contains(s"-p $port0:$port0 -p $port1:$port1") shouldBe true
  }

  @Test
  def testParseForwardPorts(): Unit = {
    val ip = "0.0.0.0"
    val minPort = 12345
    val maxPort = 12350
    val ports = DockerClient.parsePortMapping(s"$ip:$minPort-$maxPort->$minPort-$maxPort/tcp")
    ports.size shouldBe 1
    ports.find(_.hostIp == ip).get.portPairs.size shouldBe maxPort - minPort + 1
    ports.find(_.hostIp == ip).get.portPairs shouldBe (minPort to maxPort).map(port => PortPair(port, port)).toSeq
  }

  @Test
  def testParseForwardPorts2(): Unit = {
    val ip = "0.0.0.0"
    val hostPorts = Seq.fill(5)(Random.nextInt(10000))
    val containerPorts = Seq.fill(5)(Random.nextInt(10000))
    val ports = DockerClient.parsePortMapping(
      hostPorts.zipWithIndex
        .map {
          case (p, index) => s"$ip:$p->${containerPorts(index)}/tcp"
        }
        .mkString(", "))
    ports.size shouldBe 1
    ports.find(_.hostIp == ip).get.portPairs.size shouldBe hostPorts.size
    hostPorts.zipWithIndex.foreach {
      case (p, index) =>
        ports.find(_.hostIp == ip).get.portPairs.find(_.hostPort == p).get.containerPort shouldBe containerPorts(index)
    }
  }
}

/**
  * SSH server and client are shared by all test cases since the cost of newing them is not cheap...
  */
object TestDockerClientWithoutDockerServer {

  private val CONTAINERS = State.all.map(
    s =>
      ContainerDescription(
        nodeName = CommonUtil.hostname(),
        id = s"id-${s.name}",
        image = s"image-${s.name}",
        created = s"created-${s.name}",
        state = s,
        name = s"name-${s.name}",
        size = s"size-${s.name}",
        portMappings = Seq.empty,
        environments = Map("env0" -> "abc", "env1" -> "ccc"),
        hostname = "localhost"
    ))

  private[this] def containerToString(container: ContainerDescription): String = Seq(
    container.id,
    container.image,
    container.created,
    container.state,
    container.name,
    container.size
  ).mkString(DockerClient.DIVIDER)

  private val SERVER = SshdServer.local(
    0,
    Seq(
      // handle normal
      new CommandHandler {
        override def belong(command: String): Boolean = command == s"docker ps -a --format $LIST_PROCESS_FORMAT"
        override def execute(command: String): Seq[String] = if (belong(command)) CONTAINERS.map(containerToString)
        else throw new IllegalArgumentException(s"$command doesn't support")
      },
      // handle env
      new CommandHandler {
        override def belong(command: String): Boolean =
          command.contains("docker inspect") && command.contains("Config.Env")
        override def execute(command: String): Seq[String] = if (belong(command)) Seq("[env0=abc env1=ccc]")
        else throw new IllegalArgumentException(s"$command doesn't support")
      },
      // handle hostname
      new CommandHandler {
        override def belong(command: String): Boolean =
          command.contains("docker inspect") && command.contains("Config.Hostname")
        override def execute(command: String): Seq[String] = if (belong(command)) Seq("localhost")
        else throw new IllegalArgumentException(s"$command doesn't support")
      },
      // final
      new CommandHandler {
        override def belong(command: String): Boolean = true
        override def execute(command: String): Seq[String] =
          throw new IllegalArgumentException(s"$command doesn't support")
      }
    )
  )

  private val CLIENT =
    DockerClient
      .builder()
      .hostname(SERVER.hostname)
      .port(SERVER.port)
      .user(SERVER.user)
      .password(SERVER.password)
      .build()

  @AfterClass
  def afterAll(): Unit = {
    ReleaseOnce.close(CLIENT)
    ReleaseOnce.close(SERVER)
  }
}
