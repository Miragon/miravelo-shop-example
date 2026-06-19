package io.miragon.shop.adapter.inbound.rest.order

import io.github.oshai.kotlinlogging.KotlinLogging
import io.miragon.shop.application.port.inbound.PlaceOrderUseCase
import io.miragon.shop.adapter.inbound.security.JwtUserMapper
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/orders")
class CompleteOrderController(
    private val completeOrderUseCase: PlaceOrderUseCase
) {

    private val log = KotlinLogging.logger {}

    @PostMapping
    fun completeOrder(@AuthenticationPrincipal jwt: Jwt): ResponseEntity<OrderDto> {
        val userId = JwtUserMapper.toUserId(jwt)
        log.info { "Completing order for user: $userId" }
        val order = completeOrderUseCase.placeOrder(userId)
        return ResponseEntity.ok(OrderDto.fromDomain(order))
    }
}