package io.miragon.shop.adapter.inbound.rest.cart

import io.github.oshai.kotlinlogging.KotlinLogging
import io.miragon.shop.application.port.inbound.RemoveFromCartUseCase
import io.miragon.shop.domain.article.ArticleId
import io.miragon.shop.adapter.inbound.security.JwtUserMapper
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.*

@RestController
@RequestMapping("/api/cart")
class RemoveFromCartController(
    private val removeFromCartUseCase: RemoveFromCartUseCase
) {

    private val log = KotlinLogging.logger {}

    @DeleteMapping("/items/{articleId}")
    fun removeFromCart(
        @AuthenticationPrincipal jwt: Jwt,
        @PathVariable articleId: UUID
    ): ResponseEntity<CartDto> {
        val userId = JwtUserMapper.toUserId(jwt)
        val articleIdValue = ArticleId(articleId)
        log.info { "Removing item from cart - User: $userId, Article: $articleIdValue" }
        val cart = removeFromCartUseCase.removeFromCart(userId, articleIdValue)
        return ResponseEntity.ok(CartDto.fromDomain(cart))
    }
}