"""
CartZen ML Service - Feature Engineering Pipeline
Provides privacy-preserving feature extraction with temporal cutoff guards to prevent data leakage.
"""

from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

class FeatureExtractor:
    """
    Extracts non-sensitive, privacy-preserving shopping behavior features
    for candidate products based on customer historical interaction data.
    """

    @staticmethod
    def extract_user_features(
        events: List[Dict[str, Any]],
        cutoff_timestamp: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Extracts user profile aggregate features using events ONLY before cutoff_timestamp
        to strictly prevent temporal data leakage.
        """
        if cutoff_timestamp is None:
            cutoff_timestamp = datetime.now(timezone.utc)

        valid_events = []
        for e in events:
            raw_ts = e.get("timestamp")
            if isinstance(raw_ts, str):
                try:
                    dt = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
                except ValueError:
                    dt = cutoff_timestamp
            elif isinstance(raw_ts, datetime):
                dt = raw_ts
            else:
                dt = cutoff_timestamp

            if dt <= cutoff_timestamp:
                valid_events.append(e)

        total_events = len(valid_events)
        category_counts: Dict[str, int] = {}
        purchased_prod_counts: Dict[str, int] = {}
        rec_clicks = 0
        rec_adds = 0
        last_event_time: Optional[datetime] = None

        for e in valid_events:
            event_type = e.get("eventType")
            meta = e.get("metadata", {})
            cat = meta.get("category")
            prod_id = meta.get("productId")

            if cat:
                category_counts[cat] = category_counts.get(cat, 0) + 1

            if event_type == "PURCHASE" and prod_id:
                purchased_prod_counts[prod_id] = purchased_prod_counts.get(prod_id, 0) + 1

            if event_type == "RECOMMENDATION_CLICKED":
                rec_clicks += 1
            elif event_type == "RECOMMENDATION_ADDED":
                rec_adds += 1

        recency_days = 0.0
        if valid_events and last_event_time:
            delta = cutoff_timestamp - last_event_time
            recency_days = max(0.0, delta.total_seconds() / 86400.0)

        return {
            "total_events": total_events,
            "category_affinity": category_counts,
            "frequent_products": purchased_prod_counts,
            "rec_interaction_score": rec_clicks * 1.0 + rec_adds * 2.0,
            "recency_days": recency_days
        }

    @staticmethod
    def extract_product_features(product: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extracts product features including nutrition classification and price attributes.
        Strictly excludes sensitive attributes (health diagnoses, medical status, religion).
        """
        nutrition = product.get("nutrition", {}) or {}
        protein = float(nutrition.get("protein", 0) or 0)
        fibre = float(nutrition.get("fibre", 0) or 0)
        sugar = float(nutrition.get("totalSugar", 0) or 0)
        calories = float(nutrition.get("calories", 0) or 0)

        nutrition_tags = []
        if protein >= 10:
            nutrition_tags.append("HIGH_PROTEIN")
        if sugar <= 5 and sugar > 0:
            nutrition_tags.append("LOW_SUGAR")
        if fibre >= 5:
            nutrition_tags.append("HIGH_FIBRE")
        if calories > 0 and calories <= 150:
            nutrition_tags.append("LOW_CALORIE")

        return {
            "id": product.get("id"),
            "name": product.get("name", ""),
            "brand": product.get("brand", ""),
            "category": product.get("category", "General"),
            "price": float(product.get("price", 0) or 0),
            "nutrition_tags": nutrition_tags,
            "protein": protein,
            "fibre": fibre,
            "sugar": sugar,
            "calories": calories,
        }
