import {AppBar, Badge, Button, IconButton, Toolbar, Typography} from "@mui/material"
import {Receipt as ReceiptIcon, ShoppingCart as ShoppingCartIcon, Store as StoreIcon} from "@mui/icons-material";
import {LogoutButton} from "./auth/logout-button.tsx";
import {ApplicationRoutes} from "./application-routes.tsx";
import {useCart} from "../hooks/cart.hook";
import {useNavigate} from "react-router";
import React, {useCallback, useMemo} from "react";
import {getCartItemCount} from "../utils/cart.utils.ts";

/**
 * This is the main app-component.
 * It contains the basic layout for each page and initializes the router
 */
export const AppContent = () => {
    const {data: cart} = useCart();
    const navigate = useNavigate();

    const cartItemCount = useMemo(() => {
        return getCartItemCount(cart);
    }, [cart]);

    const handleNavigateToCart = useCallback(() => {
        navigate('/cart');
    }, [navigate]);

    const handleNavigateToArticles = useCallback(() => {
        navigate('/articles');
    }, [navigate]);

    const handleNavigateToOrders = useCallback(() => {
        navigate('/orders');
    }, [navigate]);

    return (
        <React.Fragment>
            <AppBar position="static">
                <Toolbar>
                    <Button
                        color="inherit"
                        startIcon={<StoreIcon/>}
                        onClick={handleNavigateToArticles}
                        sx={{mr: 2}}>
                        <Typography variant="h6" component="div">
                            Miravelo
                        </Typography>
                    </Button>

                    <div style={{flexGrow: 1}}/>

                    <IconButton
                        color="inherit"
                        onClick={handleNavigateToOrders}
                        sx={{mr: 1}}
                        title="Orders"
                    >
                        <ReceiptIcon/>
                    </IconButton>

                    <IconButton
                        color="inherit"
                        onClick={handleNavigateToCart}
                        sx={{mr: 2}}
                        title="Cart"
                    >
                        <Badge badgeContent={cartItemCount} color="secondary">
                            <ShoppingCartIcon/>
                        </Badge>
                    </IconButton>

                    <LogoutButton color="inherit"/>
                </Toolbar>
            </AppBar>
            <div style={{padding: 25, paddingTop: 35}}>
                <ApplicationRoutes/>
            </div>
        </React.Fragment>
    )
}