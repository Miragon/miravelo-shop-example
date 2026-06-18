import {useCallback} from "react";
import {Alert, Box, CircularProgress, Typography} from "@mui/material";
import {ShoppingBag as ShoppingBagIcon, Storefront as StorefrontIcon} from "@mui/icons-material";
import {useArticles} from "../../hooks/articles.hook.ts";
import {ArticleCard} from "./components/article-card.tsx";
import {If} from "../../shared/if.tsx";
import {useNavigate} from "react-router";

export function ArticleOverviewPage() {
    const {status, data, error} = useArticles();
    const navigate = useNavigate();

    const navigateToArticleDetails = useCallback((articleId: string) => {
        navigate(`/articles/${articleId}`);
    }, [navigate]);

    if (status === 'pending') {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress/>
            </Box>
        );
    }

    if (status === 'error') {
        return (
            <Alert severity="error">
                Error loading articles: {(error as Error).message}
            </Alert>
        );
    }

    const hasArticles = Boolean(data && data.length > 0);

    return (
        <Box maxWidth="1200px" margin="0 auto" padding="2rem">
            <Typography variant="h4" component="h1" gutterBottom>
                <StorefrontIcon sx={{mr: 2, verticalAlign: 'middle'}}/>
                All Articles
            </Typography>

            <If condition={!hasArticles}>
                <Box
                    data-testid={"Box-NoArticles"}
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    minHeight="400px"
                    textAlign="center"
                >
                    <ShoppingBagIcon sx={{fontSize: 80, color: 'grey.400', mb: 3}}/>
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                        No articles available
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Check back later for new bikes and gear!
                    </Typography>
                </Box>
            </If>

            <If condition={hasArticles}>
                <Box
                    data-testid={"Box-HasArticles"}
                    display="grid"
                    gridTemplateColumns={{
                        xs: 'repeat(1, 1fr)',
                        sm: 'repeat(2, 1fr)',
                        md: 'repeat(3, 1fr)',
                        lg: 'repeat(4, 1fr)'
                    }}
                    gap={3}
                >
                    {data?.map((article) => (
                        <ArticleCard
                            testId={`ArticleCard-${article.id}`}
                            key={article.id}
                            article={article}
                            clickOnCard={navigateToArticleDetails}
                        />
                    ))}
                </Box>
            </If>
        </Box>
    );
}