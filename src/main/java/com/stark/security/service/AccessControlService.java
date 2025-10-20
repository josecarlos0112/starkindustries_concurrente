package com.stark.security.service;

import org.springframework.stereotype.Service;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AccessControlService {
  private final Set<String> authorizedBadges = ConcurrentHashMap.newKeySet();

  public AccessControlService() {
    // preload some authorized badges
    authorizedBadges.add("BADGE-123");
    authorizedBadges.add("BADGE-456");
  }

  public boolean isAuthorized(String badgeId) {
    return authorizedBadges.contains(badgeId);
  }

  public void authorize(String badgeId) {
    authorizedBadges.add(badgeId);
  }

  public void revoke(String badgeId) {
    authorizedBadges.remove(badgeId);
  }
}
