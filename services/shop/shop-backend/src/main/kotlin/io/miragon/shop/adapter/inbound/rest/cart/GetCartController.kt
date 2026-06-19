package io.miragon.shop.adapter.inbound.rest.cart

import io.github.oshai.kotlinlogging.KotlinLogging
import io.miragon.shop.application.port.inbound.CartQuery
import io.miragon.shop.adapter.inbound.security.JwtUserMapper
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/cart")
class GetCartController(
    private val query: CartQuery
) {

    private val log = KotlinLogging.logger {}

    @GetMapping
    fun getCart(@AuthenticationPrincipal jwt: Jwt): ResponseEntity<CartDto> {
        val userId = JwtUserMapper.toUserId(jwt)
        log.info { "Getting cart for user: $userId" }
        val cart = query.getCart(userId)
        return ResponseEntity.ok(CartDto.fromDomain(cart))
    }
}