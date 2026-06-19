package io.miragon.shop.adapter.inbound.rest.order

import io.github.oshai.kotlinlogging.KotlinLogging
import io.miragon.shop.application.port.inbound.OrdersQuery
import io.miragon.shop.adapter.inbound.security.JwtUserMapper
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/orders")
class GetOrdersController(
    private val getOrdersByUserQuery: OrdersQuery
) {

    private val log = KotlinLogging.logger {}

    @GetMapping
    fun getOrdersByUser(@AuthenticationPrincipal jwt: Jwt): ResponseEntity<List<OrderDto>> {
        val userId = JwtUserMapper.toUserId(jwt)
        log.info { "Getting orders for user: $userId" }
        val orders = getOrdersByUserQuery.getOrders(userId)
        return ResponseEntity.ok(orders.map { OrderDto.fromDomain(it) })
    }
}