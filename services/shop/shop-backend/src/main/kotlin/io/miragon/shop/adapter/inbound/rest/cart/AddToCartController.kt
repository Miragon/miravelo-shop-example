package io.miragon.shop.adapter.inbound.rest.cart

import io.github.oshai.kotlinlogging.KotlinLogging
import io.miragon.shop.application.port.inbound.AddToCartUseCase
import io.miragon.shop.domain.article.ArticleId
import io.miragon.shop.adapter.inbound.security.JwtUserMapper
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.*

@RestController
@RequestMapping("/api/cart")
class AddToCartController(
    private val addToCartUseCase: AddToCartUseCase
) {

    private val log = KotlinLogging.logger {}

    @PostMapping("/items")
    fun addToCart(
        @AuthenticationPrincipal jwt: Jwt,
        @RequestBody request: AddToCartRequest
    ): ResponseEntity<CartDto> {
        val userId = JwtUserMapper.toUserId(jwt)
        val articleId = ArticleId(request.articleId)
        log.debug { "Received request to add item $articleId to cart of $userId" }
        val cart = addToCartUseCase.addToCart(userId, articleId)
        return ResponseEntity.ok(CartDto.fromDomain(cart))
    }

    data class AddToCartRequest(val articleId: UUID)
}