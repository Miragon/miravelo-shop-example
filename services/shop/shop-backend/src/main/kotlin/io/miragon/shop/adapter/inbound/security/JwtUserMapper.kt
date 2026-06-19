package io.miragon.shop.adapter.inbound.security

import io.miragon.shop.domain.shared.UserId
import org.springframework.security.oauth2.jwt.Jwt

object JwtUserMapper {

    /**
     * Extracts the [UserId] from the authenticated JWT's `sub` claim.
     *
     * @throws IllegalArgumentException if the token is missing the required `sub` claim.
     */
    fun toUserId(jwt: Jwt): UserId =
        UserId(requireNotNull(jwt.subject) { "JWT is missing required sub claim" })
}
