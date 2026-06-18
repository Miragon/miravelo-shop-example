/**
 * This setting file is the entry point of the Gradle build.
 * Its primary purpose is to define the subprojects.
 * It is also used for some aspects of project-wide configuration,
 * like managing plugins, dependencies, etc.
 * https://docs.gradle.org/current/userguide/settings_file_basics.html
 */

dependencyResolutionManagement {
    @Suppress("UnstableApiUsage")
    repositories {
        mavenCentral()
    }
}

include("services:warehouse:warehouse-backend")
include("services:delivery:delivery-backend")
include("services:shop:shop-backend")
include("services:shop:shop-mcp-client")

rootProject.name = "miravelo"