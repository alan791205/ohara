package com.island.ohara.serialization

import com.island.ohara.rule.SmallTest
import org.junit.Test
import org.scalatest.Matchers

class TestDataType extends SmallTest with Matchers {

  @Test
  def testIndexWithoutDuplicate(): Unit = {
    collection.SortedSet(DataType.all.map(_.index): _*).size shouldBe DataType.all.size
  }

  @Test
  def testIndexByName(): Unit = {
    DataType.all.map(t => {
      DataType.of(t.getClass.getSimpleName) shouldBe t
    })
  }

  @Test
  def testTypeName(): Unit = {
    // it should pass
    DataType.all.foreach(dataType => DataType.of(dataType.name))
    DataType.all.foreach(dataType => DataType.of(dataType.name.toLowerCase))
  }
}