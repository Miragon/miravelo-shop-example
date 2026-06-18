package io.miragon.shop.adapter.inbound.security

import io.github.oshai.kotlinlogging.KLogger
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.core.convert.converter.Converter
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.oauth2.jwt.Jwt

class JwtRolesConverter : Converter<Jwt, Collection<GrantedAuthority>> {

    private val log: KLogger = KotlinLogging.logger { }

    override fun convert(jwt: Jwt): Collection<GrantedAuthority> {
        log.debug { "Extracting roles from jwt token for subject=${jwt.subject}" }
        val realmAccess = jwt.getClaimAsMap("realm_access") ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        val roles = realmAccess["roles"] as? List<String> ?: return emptyList()
        return roles.map { SimpleGrantedAuthority("ROLE_${it.uppercase()}") }
    }
}
