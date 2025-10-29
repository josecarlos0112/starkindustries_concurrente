package com.stark.security.service;

import org.springframework.stereotype.Service;
import java.util.Set;
import java.util.HashSet;

@Service
public class AccessControlService {
  private final Set<String> authorizedBadges = new HashSet<>();

  public AccessControlService() {
    // preload some authorized badges
    authorizedBadges.add("BADGE-123");
    authorizedBadges.add("BADGE-456");
  }

  public boolean isAuthorized(String badgeId) {
    return authorizedBadges.contains(badgeId);
  }

}

