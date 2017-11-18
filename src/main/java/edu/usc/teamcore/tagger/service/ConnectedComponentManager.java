package edu.usc.teamcore.tagger.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Component;

import lombok.Data;

@Data
@Component
public class ConnectedComponentManager {

	
	public List<Integer> findConnectedComponent(int[][] adjMatrix) {
		
		Set<String> ones = new HashSet<String>();
		Set<String> onesCol = new HashSet<String>();
		Set<Set<String>> components = new HashSet<Set<String>>();
		
		findAdjacentNodesByRow(adjMatrix, ones, components);
		findAdjacentNodesByCol(adjMatrix, onesCol, components);
		
//		System.out.println("row: " + ones);
//		System.out.println("col: " + onesCol);
//		System.out.println("components: " + components);
		
		ones.retainAll(onesCol);
		//System.out.println(ones);
		
		for(String position : ones) {
			Set<String> newComponent = new HashSet<String>();
			for(Set<String> component : components) {
				if(component.contains(position)) {
					newComponent.addAll(component);
				}
			}
			components.add(newComponent);
		}
		Set<String> largestComponent = findLargestComponent(components);
		
		List<Integer> midpoint = null;
		if(largestComponent != null && largestComponent.size() > 0) {
			midpoint = new ArrayList<Integer>();
			int minX = Integer.MAX_VALUE, minY = Integer.MAX_VALUE, maxX = Integer.MIN_VALUE, maxY = Integer.MIN_VALUE;
			//System.out.println("\nLargest Component:");
			for(String point : largestComponent) {
				int x = Integer.parseInt(point.split(",")[0]);
				maxX = Math.max(maxX, x);
				minX = Math.min(minX, x);
				
				int y = Integer.parseInt(point.split(",")[1]);
				maxY = Math.max(maxY, y);
				minY = Math.min(minY, y);
				//System.out.println(x+ "," + y);
				
			}
			int midX = minX + (maxX-minX)/2;
			midpoint.add(midX);

			int midY = minY + (maxY-minY)/2;
			midpoint.add(midY);
			System.out.println("Top left: " + minX +","+ minY + " size: " +(maxX-minX) + "x" + (maxY-minY));
		}
		return midpoint;
	}

	private Set<String> findLargestComponent(Set<Set<String>> components) {
		int maxCompSize = Integer.MIN_VALUE;
		Map<Integer, Set<Set<String>>> componentsBySize = new HashMap<Integer, Set<Set<String>>>();
		for(Set<String> component : components){
			if(component.size() > maxCompSize) {
				maxCompSize = component.size();
				Set<Set<String>> lComponents = componentsBySize.get(maxCompSize);
				if(lComponents == null) lComponents = new HashSet<Set<String>>();
				lComponents.add(component);
				componentsBySize.put(maxCompSize, lComponents);
			}
		}
		
		Set<String> largestComponent = null;
		Set<Set<String>> lComponents = componentsBySize.get(maxCompSize);
		if(lComponents!= null && lComponents.size() == 1) 
			largestComponent = lComponents.iterator().next();
		return largestComponent;
	}

	private void findAdjacentNodesByRow(int[][] adjMatrix, Set<String> ones, Set<Set<String>> components) {
		for(int i = 0; i < adjMatrix.length; i++) {
			Set<Integer> neighbors = new HashSet<Integer>();
			Set<String> component = new HashSet<String>();
			for(int j = 0; j < adjMatrix[i].length -1; j++) {
				if(adjMatrix[i][j+1] > 0 && adjMatrix[i][j] > 0) { 
					//if adjacent cells in row are bright
					neighbors.add(j);
					neighbors.add(j+1);
					
					String adj1 = i+ "," +j;
					ones.add(adj1);
					component.add(adj1);
					
					String adj2 = i+ "," + (j+1);
					ones.add(adj2);
					component.add(adj2);
					
				} else if(component.size() > 0) {
					components.add(component);	
					component = new HashSet<String>();
				}
			}
		}
	}
	
	private void findAdjacentNodesByCol(int[][] adjMatrix, Set<String> onesCol, Set<Set<String>> components) {
		for(int j = 0; j < adjMatrix[0].length; j++) {
			Set<Integer> neighbors = new HashSet<Integer>();
			Set<String> component = new HashSet<String>();
			for(int i = 0; i < adjMatrix.length-1; i++) {
				if(adjMatrix[i+1][j] > 0 && adjMatrix[i][j] > 0) {
					//if adjacent cells in col are bright
					neighbors.add(i);
					neighbors.add(i+1);
					
					String adj1 = i +"," + j;
					onesCol.add(adj1);
					component.add(adj1);
					
					String adj2 = (i+1) +"," + j;
					onesCol.add(adj2);
					component.add(adj2);
				
				} else if(component.size() > 0) {
					components.add(component);
					component = new HashSet<String>();
				}
			}
		}
	}
	
	public static void main1(String[] args) {
		ConnectedComponentManager componentMgr = new ConnectedComponentManager(); 
		/*
		int[][] adjMatrix = {{0, 0, 0, 0, 0, 0, 0, 1, 1, 0},
				{0, 0, 0, 1, 1, 0, 0, 0, 0, 0},
				{0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
				{0, 1, 0, 0, 0, 0, 0, 0, 1, 0},
				{0, 1, 0, 0, 0, 0, 0, 1, 0, 0},
				{0, 0, 0, 0, 0, 0, 0, 1, 0, 0},
				{0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
				{1, 0, 0, 0, 1, 1, 0, 0, 0, 0},
				{1, 0, 0, 1, 0, 1, 0, 0, 0, 0},
				{0, 0, 0, 0, 0, 0, 0, 0, 0, 0}};
		*/
		int[][] adjMatrix = 
			   {{0, 0, 0, 1, 0},
				{0, 0, 1, 1, 0},
				{0, 0, 0, 1, 0},
				{0, 0, 0, 1, 1},
				{0, 0, 0, 0, 0}};
		
		/*int[][] adjMatrix = {
				{0, 0, 0, 1, 1},
				{0, 0, 0, 1, 1},
				{0, 0, 0, 0, 0},
				{0, 0, 0, 0, 0},
				{0, 0, 0, 0, 0}
		};*/
		System.out.println(componentMgr.findConnectedComponent(adjMatrix));
	}

}