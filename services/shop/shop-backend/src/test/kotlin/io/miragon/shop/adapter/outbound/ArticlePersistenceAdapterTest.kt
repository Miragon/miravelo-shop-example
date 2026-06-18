package io.miragon.shop.adapter.outbound

import io.miragon.shop.adapter.outbound.persistence.article.ArticlePersistenceAdapter
import io.miragon.shop.adapter.outbound.persistence.flyway.SampleDataFlywayConfig
import io.miragon.shop.domain.article.ArticleId
import io.miragon.shop.domain.article.testArticle
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.autoconfigure.ImportAutoConfiguration
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest
import org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.context.annotation.Import

@DataJpaTest
@ImportAutoConfiguration(FlywayAutoConfiguration::class)
@Import(ArticlePersistenceAdapter::class, SampleDataFlywayConfig::class)
class ArticlePersistenceAdapterTest {

    @Autowired
    private lateinit var adapter: ArticlePersistenceAdapter

    @Autowired
    private lateinit var entityManager: TestEntityManager

    @Test
    fun `should load all articles from database`() {
        // when
        val articles = adapter.loadAll()

        // then
        assertThat(articles).hasSize(2)
        assertThat(articles).usingRecursiveComparison().isEqualTo(
            listOf(
                testArticle(
                    id = ArticleId("788b6181-c18b-4fff-a13a-43b9950c798d"),
                    name = "Miravelo Gravel One",
                    description = "Aluminium gravel bike built for long weekends in the woods and the occasional questionable shortcut.",
                    price = 1899.00
                ),
                testArticle(
                    id = ArticleId("49597d42-36f0-4f05-a9eb-d9bf6c562d24"),
                    name = "Miravelo Gravel Pro Carbon",
                    description = "Lightweight carbon gravel bike for everyone who just wants to \"quickly\" ride 120 km.",
                    price = 4299.00
                )
            )
        )
    }

    @Test
    fun `should save article to database`() {
        // given
        val article = testArticle(
            id = ArticleId(),
            name = "Test Article",
            description = "Test Description",
            price = 199.99
        )

        // when
        adapter.save(article)
        entityManager.flush()

        // then
        val loadedArticles = adapter.loadAll()
        assertThat(loadedArticles).anySatisfy { loadedArticle ->
            assertThat(loadedArticle).usingRecursiveComparison().isEqualTo(
                testArticle(
                    id = article.id,
                    name = article.name.value,
                    description = article.description.value,
                    price = article.price.value
                )
            )
        }
    }
} 
