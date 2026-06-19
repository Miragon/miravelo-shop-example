package io.miragon.shop.adapter.inbound.rest.order

import io.github.oshai.kotlinlogging.KotlinLogging
import io.miragon.shop.application.port.inbound.OrderQuery
import io.miragon.shop.domain.order.OrderId
import io.miragon.shop.adapter.inbound.security.JwtUserMapper
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.*

@RestController
@RequestMapping("/api/orders")
class GetOrderController(
    private val query: OrderQuery
) {

    private val log = KotlinLogging.logger {}

    @GetMapping("/{orderId}")
    fun getOrder(
        @AuthenticationPrincipal jwt: Jwt,
        @PathVariable orderId: UUID
    ): ResponseEntity<OrderDto> {
        val userId = JwtUserMapper.toUserId(jwt)
        val orderIdValue = OrderId(orderId)
        log.info { "Getting order: $orderIdValue for user: $userId" }
        val order = query.getOrderById(orderIdValue)
        return ResponseEntity.ok(OrderDto.fromDomain(order))
    }
}