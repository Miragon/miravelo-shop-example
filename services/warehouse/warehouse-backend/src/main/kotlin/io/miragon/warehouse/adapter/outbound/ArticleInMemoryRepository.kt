package io.miragon.warehouse.adapter.outbound

import io.miragon.warehouse.application.port.outbound.ArticleRepository
import io.miragon.warehouse.domain.Article
import io.miragon.warehouse.domain.shared.ArticleDescription
import io.miragon.warehouse.domain.shared.ArticleId
import io.miragon.warehouse.domain.shared.ArticleName
import io.miragon.warehouse.domain.shared.Price
import org.springframework.stereotype.Component
import java.util.*

@Component
class ArticleInMemoryRepository : ArticleRepository {

    private val articles = testArticles()

    override fun loadAll() = articles

    private fun testArticles() = listOf(
        Article(
            id = ArticleId(UUID.fromString("788b6181-c18b-4fff-a13a-43b9950c798d")),
            name = ArticleName("Miravelo Gravel One"),
            description = ArticleDescription("Aluminium gravel bike built for long weekends in the woods and the occasional questionable shortcut."),
            price = Price(1899.00),
        ),
        Article(
            id = ArticleId(UUID.fromString("49597d42-36f0-4f05-a9eb-d9bf6c562d24")),
            name = ArticleName("Miravelo Gravel Pro Carbon"),
            description = ArticleDescription("Lightweight carbon gravel bike for everyone who just wants to \"quickly\" ride 120 km."),
            price = Price(4299.00),
        ),
        Article(
            id = ArticleId(UUID.fromString("58191458-4b10-401c-b85b-beba3c8d9667")),
            name = ArticleName("Miravelo Roadster Endurance"),
            description = ArticleDescription("Comfort-focused road bike for relaxed after-work loops that turn into epics."),
            price = Price(2499.00),
        ),
        Article(
            id = ArticleId(UUID.fromString("b3145287-0993-42ce-990e-8292b5b2cbcf")),
            name = ArticleName("Miravelo Aero RS"),
            description = ArticleDescription("Aero race bike for chasing Strava segments nobody else cares about."),
            price = Price(5999.00),
        )
    )
}